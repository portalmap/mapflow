import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AllTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  list_id: string;
  parent_id: string | null;
  status: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  list: {
    id: string;
    name: string;
    space_id: string;
    folder_id: string | null;
    space: {
      id: string;
      name: string;
    } | null;
    folder: {
      id: string;
      name: string;
    } | null;
  } | null;
}

const TASKS_PAGE_SIZE = 1000;

const TASKS_SELECT = `
  id,
  title,
  description,
  priority,
  due_date,
  start_date,
  completed_at,
  created_at,
  updated_at,
  workspace_id,
  list_id,
  parent_id,
  status:statuses(id, name, color),
  assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
  list:lists(
    id,
    name,
    space_id,
    folder_id,
    space:spaces(id, name),
    folder:folders(id, name)
  )
`;

/**
 * Fetches every workspace task, paginating because Supabase caps each
 * response at 1000 rows.
 */
async function fetchWorkspaceTasks(workspaceId: string) {
  const all: any[] = [];

  for (let offset = 0; ; offset += TASKS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('tasks')
      .select(TASKS_SELECT)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + TASKS_PAGE_SIZE - 1);

    if (error) throw error;
    if (data?.length) all.push(...data);
    if (!data || data.length < TASKS_PAGE_SIZE) break;
  }

  return all;
}

export function useAllTasks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['all-tasks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const data = await fetchWorkspaceTasks(workspaceId);
      return data as unknown as AllTask[];
    },
    enabled: !!workspaceId,
  });
}

export function useAllTasksWithAssignees(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['all-tasks-with-assignees', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Fetch tasks (paginated)
      const tasks = await fetchWorkspaceTasks(workspaceId);

      // Fetch all assignees for these tasks (batched to avoid URL length limits)
      const taskIds = tasks?.map(t => t.id) || [];
      const BATCH_SIZE = 50;

      const taskChunks: string[][] = [];
      for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
        taskChunks.push(taskIds.slice(i, i + BATCH_SIZE));
      }

      const allAssignees: { task_id: string; user_id: string }[] = [];
      for (const chunk of taskChunks) {
        const { data, error } = await supabase
          .from('task_assignees')
          .select('task_id, user_id')
          .in('task_id', chunk);
        if (error) throw error;
        if (data) allAssignees.push(...data);
      }

      // Fetch profiles for assignees (batched)
      const userIds = [...new Set(allAssignees.map(a => a.user_id))];
      const allProfiles: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
      const userChunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        userChunks.push(userIds.slice(i, i + BATCH_SIZE));
      }
      for (const chunk of userChunks) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', chunk);
        if (error) throw error;
        if (data) allProfiles.push(...data);
      }

      const profilesMap = allProfiles.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, { id: string; full_name: string | null; avatar_url: string | null }>);

      const assigneesByTask = allAssignees.reduce((acc, a) => {
        if (!acc[a.task_id]) acc[a.task_id] = [];
        const profile = profilesMap[a.user_id];
        if (profile) acc[a.task_id].push(profile);
        return acc;
      }, {} as Record<string, Array<{ id: string; full_name: string | null; avatar_url: string | null }>>);

      return (tasks || []).map(task => ({
        ...task,
        assignees: assigneesByTask[task.id] || [],
      })) as unknown as (AllTask & { assignees: Array<{ id: string; full_name: string | null; avatar_url: string | null }> })[];
    },
    enabled: !!workspaceId,
  });
}

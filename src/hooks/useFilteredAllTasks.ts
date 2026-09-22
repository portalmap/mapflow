import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AllTask } from './useAllTasks';

export type ViewMode = 'assigned' | 'my-spaces';

export type TaskWithAssignees = AllTask & { 
  assignees: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  followers: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
};

export function useFilteredAllTasks(
  workspaceId: string | undefined,
  viewMode: ViewMode = 'assigned',
  showTransferred: boolean = false
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['filtered-all-tasks', workspaceId, user?.id, viewMode, showTransferred],
    queryFn: async () => {
      if (!workspaceId || !user) return [];

      // Check role directly for the specific workspace being queried
      const { data: globalRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasGlobalAdmin = globalRoles?.some(r => 
        ['global_owner', 'owner', 'admin'].includes(r.role)
      ) ?? false;

      let isAdmin = hasGlobalAdmin;

      // If no global admin role, check workspace-specific role
      if (!isAdmin) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('workspace_id', workspaceId)
          .single();

        isAdmin = membership?.role === 'admin';
      }

      // Admin: fetch all tasks
      // Member with 'my-spaces': fetch tasks from spaces they have permission
      // Member with 'assigned': fetch only tasks assigned to them
      let taskIds: string[] | null = null;
      let listIds: string[] | null = null;

      if (!isAdmin) {
        if (viewMode === 'my-spaces') {
          // Get spaces where user has permission
          const { data: spacePerms, error: spacePermsError } = await supabase
            .from('space_permissions')
            .select('space_id')
            .eq('user_id', user.id);

          if (spacePermsError) throw spacePermsError;

          const spaceIds = spacePerms?.map(p => p.space_id) || [];

          if (spaceIds.length === 0) return [];

          // Get lists from those spaces (direct lists + lists inside folders)
          const { data: directLists, error: directListsError } = await supabase
            .from('lists')
            .select('id')
            .in('space_id', spaceIds);

          if (directListsError) throw directListsError;

          // Also get lists from folders in those spaces
          const { data: folders, error: foldersError } = await supabase
            .from('folders')
            .select('id')
            .in('space_id', spaceIds);

          if (foldersError) throw foldersError;

          const folderIds = folders?.map(f => f.id) || [];
          let folderListIds: string[] = [];

          if (folderIds.length > 0) {
            const { data: folderLists, error: folderListsError } = await supabase
              .from('lists')
              .select('id')
              .in('folder_id', folderIds);

            if (folderListsError) throw folderListsError;
            folderListIds = folderLists?.map(l => l.id) || [];
          }

          listIds = [...(directLists?.map(l => l.id) || []), ...folderListIds];

          if (listIds.length === 0) return [];
        } else {
          // viewMode === 'assigned': Get task IDs where user is assigned
          const { data: assignments, error: assignError } = await supabase
            .from('task_assignees')
            .select('task_id')
            .eq('user_id', user.id);

          if (assignError) throw assignError;
          
          const assignedIds = assignments?.map(a => a.task_id) || [];

          // Also include transferred tasks if enabled
          let transferredIds: string[] = [];
          if (showTransferred) {
            const { data: history, error: histError } = await supabase
              .from('task_assignee_history')
              .select('task_id')
              .eq('user_id', user.id)
              .not('unassigned_at', 'is', null);

            if (histError) throw histError;
            transferredIds = history?.map(h => h.task_id) || [];
          }

          const combinedIds = [...new Set([...assignedIds, ...transferredIds])];
          if (combinedIds.length === 0) return [];

          taskIds = combinedIds;
        }
      }

      // Fetch tasks (paginated: Supabase caps each response at 1000 rows)
      const PAGE_SIZE = 1000;
      const buildQuery = () => {
        let query = supabase
          .from('tasks')
          .select(`
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
          `)
          .eq('workspace_id', workspaceId)
          .is('archived_at', null)
          .is('parent_id', null)
          .order('created_at', { ascending: false });

        // Apply filters based on mode
        if (listIds !== null) {
          query = query.in('list_id', listIds);
        } else if (taskIds !== null) {
          query = query.in('id', taskIds);
        }

        return query;
      };

      const tasks: any[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data: page, error: tasksError } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
        if (tasksError) throw tasksError;
        if (page?.length) tasks.push(...page);
        if (!page || page.length < PAGE_SIZE) break;
      }

      // Fetch all assignees for these tasks (batched to avoid URL length limits)
      const fetchedTaskIds = tasks?.map(t => t.id) || [];
      if (fetchedTaskIds.length === 0) return [];

      const BATCH_SIZE = 50;
      const taskChunks: string[][] = [];
      for (let i = 0; i < fetchedTaskIds.length; i += BATCH_SIZE) {
        taskChunks.push(fetchedTaskIds.slice(i, i + BATCH_SIZE));
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

      // Map assignees to tasks
      const assigneesByTask = allAssignees.reduce((acc, a) => {
        if (!acc[a.task_id]) acc[a.task_id] = [];
        const profile = profilesMap[a.user_id];
        if (profile) acc[a.task_id].push(profile);
        return acc;
      }, {} as Record<string, Array<{ id: string; full_name: string | null; avatar_url: string | null }>>);

      // Fetch all followers for these tasks (batched)
      const allFollowers: { task_id: string; user_id: string }[] = [];
      for (const chunk of taskChunks) {
        const { data, error } = await supabase
          .from('task_followers')
          .select('task_id, user_id')
          .in('task_id', chunk);
        if (error) throw error;
        if (data) allFollowers.push(...data);
      }

      // Fetch profiles for followers not already fetched
      const followerUserIds = [...new Set(allFollowers.map(f => f.user_id))];
      const missingFollowerIds = followerUserIds.filter(id => !profilesMap[id]);
      if (missingFollowerIds.length > 0) {
        const missingChunks: string[][] = [];
        for (let i = 0; i < missingFollowerIds.length; i += BATCH_SIZE) {
          missingChunks.push(missingFollowerIds.slice(i, i + BATCH_SIZE));
        }
        for (const chunk of missingChunks) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', chunk);
          if (error) throw error;
          if (data) data.forEach(p => { profilesMap[p.id] = p; });
        }
      }

      // Map followers to tasks
      const followersByTask = allFollowers.reduce((acc, f) => {
        if (!acc[f.task_id]) acc[f.task_id] = [];
        const profile = profilesMap[f.user_id];
        if (profile) acc[f.task_id].push(profile);
        return acc;
      }, {} as Record<string, Array<{ id: string; full_name: string | null; avatar_url: string | null }>>);

      return (tasks || []).map(task => ({
        ...task,
        assignees: assigneesByTask[task.id] || [],
        followers: followersByTask[task.id] || [],
      })) as unknown as TaskWithAssignees[];
    },
    enabled: !!workspaceId && !!user,
  });
}

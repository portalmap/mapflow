// Módulo isolado: criação das tarefas de um modelo (space_template_tasks)
// nas listas reais de destino. Usado pelos três caminhos de aplicação
// (Space novo, aplicar em Spaces, aplicar em Pastas/Listas).
import { supabase } from '@/integrations/supabase/client';

export interface TemplateTaskRow {
  id: string;
  list_ref_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  order_index: number | null;
  start_date_offset: number | null;
  due_date_offset: number | null;
  status_template_item_id: string | null;
  estimated_time: number | null;
  is_milestone: boolean | null;
  tag_names: string[] | null;
}

export interface ApplyTemplateTasksResult {
  tasksCreated: number;
  tasksSkipped: number;
  errors: string[];
}

interface ApplyTemplateTasksParams {
  templateId: string;
  workspaceId: string;
  /** template list id → real list id */
  listIdMap: Record<string, string>;
  /** status_template_item_id → real status id */
  statusIdMap?: Record<string, string>;
  createdByUserId: string;
  /** Status usado quando não há mapeamento de etapa. */
  fallbackStatusId?: string | null;
  /** Tarefas já carregadas (evita nova consulta). */
  tasks?: TemplateTaskRow[];
}

const addDays = (days: number): string => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const normalizeTitle = (title: string) => title.trim().toLowerCase();

async function resolveFallbackStatus(
  workspaceId: string,
  provided?: string | null,
): Promise<string | null> {
  if (provided) return provided;
  const { data } = await supabase
    .from('statuses')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('scope_type', 'workspace')
    .eq('is_default', true)
    .maybeSingle();
  return data?.id ?? null;
}

/** Etapa real de uma lista, casando por nome com o item do modelo de status. */
async function resolveStatusForList(
  listId: string,
  statusTemplateItemId: string | null,
  statusIdMap: Record<string, string>,
  cache: Map<string, string | null>,
): Promise<string | null> {
  if (!statusTemplateItemId) return null;
  const cacheKey = `${listId}:${statusTemplateItemId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  let resolved: string | null = null;

  const { data: templateItem } = await supabase
    .from('status_template_items')
    .select('name')
    .eq('id', statusTemplateItemId)
    .maybeSingle();

  if (templateItem?.name) {
    const { data: listStatuses } = await supabase
      .from('statuses')
      .select('id, name')
      .eq('scope_type', 'list')
      .eq('scope_id', listId);
    const match = (listStatuses || []).find(
      s => s.name.trim().toLowerCase() === templateItem.name.trim().toLowerCase(),
    );
    resolved = match?.id ?? null;
  }

  if (!resolved) resolved = statusIdMap[statusTemplateItemId] ?? null;

  cache.set(cacheKey, resolved);
  return resolved;
}

/** Cria (ou reaproveita) etiquetas por nome e vincula à tarefa. */
async function attachTags(
  taskId: string,
  workspaceId: string,
  tagNames: string[],
  tagCache: Map<string, string>,
): Promise<void> {
  const tagIds: string[] = [];

  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name) continue;
    const key = name.toLowerCase();

    if (tagCache.has(key)) {
      tagIds.push(tagCache.get(key)!);
      continue;
    }

    const { data: existing } = await supabase
      .from('task_tags')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .ilike('name', name)
      .limit(1);

    let tagId = existing?.[0]?.id ?? null;

    if (!tagId) {
      const { data: created } = await supabase
        .from('task_tags')
        .insert({ workspace_id: workspaceId, name })
        .select('id')
        .maybeSingle();
      tagId = created?.id ?? null;
    }

    if (tagId) {
      tagCache.set(key, tagId);
      tagIds.push(tagId);
    }
  }

  if (tagIds.length > 0) {
    await supabase
      .from('task_tag_relations')
      .insert(tagIds.map(tag_id => ({ task_id: taskId, tag_id })));
  }
}

/**
 * Cria as tarefas do modelo nas listas mapeadas.
 * Tarefas com título já existente na lista de destino são ignoradas.
 */
export async function applyTemplateTasksToLists({
  templateId,
  workspaceId,
  listIdMap,
  statusIdMap = {},
  createdByUserId,
  fallbackStatusId,
  tasks,
}: ApplyTemplateTasksParams): Promise<ApplyTemplateTasksResult> {
  const result: ApplyTemplateTasksResult = { tasksCreated: 0, tasksSkipped: 0, errors: [] };

  let templateTasks = tasks;
  if (!templateTasks) {
    const { data, error } = await supabase
      .from('space_template_tasks')
      .select('id, list_ref_id, title, description, priority, order_index, start_date_offset, due_date_offset, status_template_item_id, estimated_time, is_milestone, tag_names')
      .eq('template_id', templateId)
      .order('order_index');
    if (error) {
      result.errors.push(`Tarefas do modelo: ${error.message}`);
      return result;
    }
    templateTasks = (data || []) as TemplateTaskRow[];
  }

  if (templateTasks.length === 0) return result;

  const defaultStatusId = await resolveFallbackStatus(workspaceId, fallbackStatusId);
  const statusCache = new Map<string, string | null>();
  const tagCache = new Map<string, string>();
  const existingTitlesByList = new Map<string, Set<string>>();

  // Agrupa por lista de destino
  const byRealList = new Map<string, TemplateTaskRow[]>();
  for (const task of templateTasks) {
    const realListId = listIdMap[task.list_ref_id];
    if (!realListId) continue;
    const arr = byRealList.get(realListId) || [];
    arr.push(task);
    byRealList.set(realListId, arr);
  }

  for (const [realListId, listTasks] of byRealList) {
    if (!existingTitlesByList.has(realListId)) {
      const { data: existing } = await supabase
        .from('tasks')
        .select('title')
        .eq('list_id', realListId);
      existingTitlesByList.set(
        realListId,
        new Set((existing || []).map(t => normalizeTitle(t.title))),
      );
    }
    const existingTitles = existingTitlesByList.get(realListId)!;

    for (const task of listTasks) {
      if (existingTitles.has(normalizeTitle(task.title))) {
        result.tasksSkipped++;
        continue;
      }

      const statusId =
        (await resolveStatusForList(realListId, task.status_template_item_id, statusIdMap, statusCache)) ||
        defaultStatusId;

      if (!statusId) {
        result.errors.push(`Tarefa "${task.title}": nenhuma etapa disponível na lista de destino`);
        continue;
      }

      const { data: created, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspaceId,
          list_id: realListId,
          title: task.title,
          description: task.description,
          priority: (task.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          status_id: statusId,
          created_by_user_id: createdByUserId,
          start_date: task.start_date_offset != null ? addDays(task.start_date_offset) : null,
          due_date: task.due_date_offset != null ? addDays(task.due_date_offset) : null,
          estimated_time: task.estimated_time ?? null,
          is_milestone: task.is_milestone ?? false,
        })
        .select('id')
        .maybeSingle();

      if (error || !created) {
        result.errors.push(`Tarefa "${task.title}": ${error?.message || 'falha ao criar'}`);
        continue;
      }

      existingTitles.add(normalizeTitle(task.title));
      result.tasksCreated++;

      if (task.tag_names && task.tag_names.length > 0) {
        try {
          await attachTags(created.id, workspaceId, task.tag_names, tagCache);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'erro ao aplicar etiquetas';
          result.errors.push(`Tarefa "${task.title}": ${message}`);
        }
      }
    }
  }

  return result;
}

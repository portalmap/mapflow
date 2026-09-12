// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database, Json } from '@/integrations/supabase/types';
import { realMatchesTemplateName, buildRealName } from '@/lib/templateAutomationMapping';
import { applyTemplateTasksToLists, type TemplateTaskRow } from '@/lib/templateTaskApply';


type AutomationTrigger = Database['public']['Enums']['automation_trigger'];
type AutomationActionType = Database['public']['Enums']['automation_action'];
type AutomationScopeType = Database['public']['Enums']['automation_scope'];

export interface SpaceTemplateFolder {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  order_index: number;
}

export interface SpaceTemplateList {
  id: string;
  template_id: string;
  folder_ref_id: string | null;
  name: string;
  description: string | null;
  default_view: string;
  order_index: number;
  status_template_id: string | null;
}

export interface SpaceTemplateTask {
  id: string;
  template_id: string;
  list_ref_id: string;
  title: string;
  description: string | null;
  priority: string;
  order_index: number;
  start_date_offset: number | null;
  due_date_offset: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start_date_recurrence?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  due_date_recurrence?: Record<string, any> | null;
  status_template_item_id: string | null;
  estimated_time: number | null;
  is_milestone: boolean;
  tag_names: string[] | null;
}

export type TemplateType = 'space' | 'folder' | 'list';

export interface SpaceTemplate {
  id: string;
  workspace_id: string | null;
  created_by_user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  type: TemplateType;
  created_at: string;
  updated_at: string;
  folders?: SpaceTemplateFolder[];
  lists?: SpaceTemplateList[];
  tasks?: SpaceTemplateTask[];
}

// Buscar templates por tipo (globais)
export const useSpaceTemplates = (type?: TemplateType) => {
  return useQuery({
    queryKey: ['space-templates', type],
    queryFn: async () => {
      let query = supabase
        .from('space_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SpaceTemplate[];
    },
  });
};

export const useSpaceTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ['space-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const [templateResult, foldersResult, listsResult, tasksResult] = await Promise.all([
        supabase.from('space_templates').select('*').eq('id', templateId).single(),
        supabase.from('space_template_folders').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_lists').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_tasks').select('*').eq('template_id', templateId).order('order_index'),
      ]);

      if (templateResult.error) throw templateResult.error;

      return {
        ...templateResult.data,
        folders: foldersResult.data || [],
        lists: listsResult.data || [],
        tasks: (tasksResult.data || []).map(t => ({
          ...t,
          start_date_recurrence: t.start_date_recurrence as Record<string, unknown> | null,
          due_date_recurrence: t.due_date_recurrence as Record<string, unknown> | null,
        })),
      } as SpaceTemplate;
    },
    enabled: !!templateId,
  });
};

// Buscar templates com contagens, filtrado por tipo
export const useSpaceTemplatesWithStructure = (type?: TemplateType) => {
  return useQuery({
    queryKey: ['space-templates-structure', type],
    queryFn: async () => {
      let query = supabase
        .from('space_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data: templates, error } = await query;
      if (error) throw error;

      const templatesWithCounts = await Promise.all(
        (templates || []).map(async (template) => {
          const [foldersResult, listsResult, tasksResult] = await Promise.all([
            supabase.from('space_template_folders').select('id').eq('template_id', template.id),
            supabase.from('space_template_lists').select('id').eq('template_id', template.id),
            supabase.from('space_template_tasks').select('id').eq('template_id', template.id),
          ]);

          return {
            ...template,
            folderCount: foldersResult.data?.length || 0,
            listCount: listsResult.data?.length || 0,
            taskCount: tasksResult.data?.length || 0,
          };
        })
      );

      return templatesWithCounts;
    },
  });
};

interface TaskInput {
  listRefIndex: number;
  title: string;
  description: string | null;
  priority: string;
  order_index: number;
  start_date_offset?: number | null;
  due_date_offset?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start_date_recurrence?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  due_date_recurrence?: Record<string, any> | null;
  status_template_item_id?: string | null;
  estimated_time?: number | null;
  is_milestone?: boolean;
  tag_names?: string[] | null;
}

interface CreateSpaceTemplateInput {
  name: string;
  description?: string;
  color?: string;
  type?: TemplateType;
  folders?: { name: string; description: string | null; order_index: number }[];
  lists?: { folderRefIndex?: number; name: string; description: string | null; default_view: string; order_index: number; status_template_id?: string | null }[];
  tasks?: TaskInput[];
}

export const useCreateSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      color,
      type = 'space',
      folders = [],
      lists = [],
      tasks = [],
    }: CreateSpaceTemplateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create template (global - sem workspace_id)
      const { data: template, error: templateError } = await supabase
        .from('space_templates')
        .insert({
          created_by_user_id: user.id,
          name,
          description,
          color,
          type,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create folders
      const folderIdMap: Record<number, string> = {};
      if (folders.length > 0) {
        const { data: createdFolders, error: foldersError } = await supabase
          .from('space_template_folders')
          .insert(folders.map((f) => ({ ...f, template_id: template.id })))
          .select();

        if (foldersError) throw foldersError;
        createdFolders?.forEach((f, i) => {
          folderIdMap[i] = f.id;
        });
      }

      // Create lists
      const listIdMap: Record<number, string> = {};
      if (lists.length > 0) {
        const { data: createdLists, error: listsError } = await supabase
          .from('space_template_lists')
          .insert(
            lists.map((l) => ({
              template_id: template.id,
              folder_ref_id: l.folderRefIndex !== undefined ? folderIdMap[l.folderRefIndex] : null,
              name: l.name,
              description: l.description,
              default_view: l.default_view,
              order_index: l.order_index,
              status_template_id: l.status_template_id || null,
            }))
          )
          .select();

        if (listsError) throw listsError;
        createdLists?.forEach((l, i) => {
          listIdMap[i] = l.id;
        });
      }

      // Create tasks
      if (tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('space_template_tasks')
          .insert(
            tasks.map((t) => ({
              template_id: template.id,
              list_ref_id: listIdMap[t.listRefIndex],
              title: t.title,
              description: t.description,
              priority: t.priority,
              order_index: t.order_index,
              start_date_offset: t.start_date_offset ?? null,
              due_date_offset: t.due_date_offset ?? null,
              start_date_recurrence: t.start_date_recurrence ?? null,
              due_date_recurrence: t.due_date_recurrence ?? null,
              status_template_item_id: t.status_template_item_id ?? null,
              estimated_time: t.estimated_time ?? null,
              is_milestone: t.is_milestone ?? false,
              tag_names: t.tag_names ?? null,
            }))
          );

        if (tasksError) throw tasksError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar template');
      console.error(error);
    },
  });
};

interface UpdateSpaceTemplateInput {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  folders?: { name: string; description: string | null; order_index: number }[];
  lists?: { folderRefIndex?: number; name: string; description: string | null; default_view: string; order_index: number; status_template_id?: string | null }[];
  tasks?: TaskInput[];
}

export const useUpdateSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, color, folders, lists, tasks }: UpdateSpaceTemplateInput) => {
      // Update template
      const { data: template, error: templateError } = await supabase
        .from('space_templates')
        .update({ name, description, color })
        .eq('id', id)
        .select()
        .single();

      if (templateError) throw templateError;

      if (folders !== undefined) {
        // ========== STEP 1: Capture existing automations and structure BEFORE deletion ==========
        const [automationsResult, existingFoldersResult, existingListsResult] = await Promise.all([
          supabase.from('space_template_automations').select('*').eq('template_id', id),
          supabase.from('space_template_folders').select('id, name').eq('template_id', id),
          supabase.from('space_template_lists').select('id, name, folder_ref_id').eq('template_id', id),
        ]);

        const existingAutomations = automationsResult.data || [];
        const existingFolders = existingFoldersResult.data || [];
        const existingLists = existingListsResult.data || [];

        // Create maps: old ID → name
        const folderIdToName: Record<string, string> = {};
        existingFolders.forEach(f => { folderIdToName[f.id] = f.name; });

        const listIdToName: Record<string, string> = {};
        existingLists.forEach(l => { listIdToName[l.id] = l.name; });

        // ========== STEP 2: Delete existing structure (cascade deletes automations) ==========
        await supabase.from('space_template_folders').delete().eq('template_id', id);
        await supabase.from('space_template_lists').delete().eq('template_id', id).is('folder_ref_id', null);
        await supabase.from('space_template_tasks').delete().eq('template_id', id);

        // ========== STEP 3: Create new folders ==========
        const folderIdMap: Record<number, string> = {};
        const folderNameToNewId: Record<string, string> = {};
        if (folders.length > 0) {
          const { data: createdFolders, error: foldersError } = await supabase
            .from('space_template_folders')
            .insert(folders.map((f) => ({
              template_id: id,
              name: f.name,
              description: f.description,
              order_index: f.order_index,
            })))
            .select();

          if (foldersError) throw foldersError;
          createdFolders?.forEach((f, i) => {
            folderIdMap[i] = f.id;
            folderNameToNewId[f.name] = f.id;
          });
        }

        // ========== STEP 4: Create new lists ==========
        const listIdMap: Record<number, string> = {};
        const listNameToNewId: Record<string, string> = {};
        if (lists && lists.length > 0) {
          const { data: createdLists, error: listsError } = await supabase
            .from('space_template_lists')
            .insert(
              lists.map((l) => ({
                template_id: id,
                folder_ref_id: 'folderRefIndex' in l && l.folderRefIndex !== undefined 
                  ? folderIdMap[l.folderRefIndex] 
                  : null,
                name: l.name,
                description: l.description,
                default_view: l.default_view,
                order_index: l.order_index,
                status_template_id: l.status_template_id || null,
              }))
            )
            .select();

          if (listsError) throw listsError;
          createdLists?.forEach((l, i) => {
            listIdMap[i] = l.id;
            listNameToNewId[l.name] = l.id;
          });
        }

        // ========== STEP 5: Create new tasks ==========
        if (tasks && tasks.length > 0) {
          const { error: tasksError } = await supabase
            .from('space_template_tasks')
            .insert(
              tasks.map((t) => ({
                template_id: id,
                list_ref_id: listIdMap[t.listRefIndex],
                title: t.title,
                description: t.description,
                priority: t.priority,
                order_index: t.order_index,
                start_date_offset: t.start_date_offset ?? null,
                due_date_offset: t.due_date_offset ?? null,
                start_date_recurrence: t.start_date_recurrence ?? null,
                due_date_recurrence: t.due_date_recurrence ?? null,
                status_template_item_id: t.status_template_item_id ?? null,
                estimated_time: t.estimated_time ?? null,
                is_milestone: t.is_milestone ?? false,
                tag_names: t.tag_names ?? null,
              }))
            );

          if (tasksError) throw tasksError;
        }

        // ========== STEP 6: Remap and restore automations ==========
        if (existingAutomations.length > 0) {
          const remappedAutomations = existingAutomations.map(automation => {
            // Remap folder_ref_id
            let newFolderRefId: string | null = null;
            if (automation.folder_ref_id && folderIdToName[automation.folder_ref_id]) {
              const folderName = folderIdToName[automation.folder_ref_id];
              newFolderRefId = folderNameToNewId[folderName] || null;
            }

            // Remap list_ref_id
            let newListRefId: string | null = null;
            if (automation.list_ref_id && listIdToName[automation.list_ref_id]) {
              const listName = listIdToName[automation.list_ref_id];
              newListRefId = listNameToNewId[listName] || null;
            }

            // Deep clone action_config and remap target_list_id inside actions
            const remappedActionConfig = JSON.parse(JSON.stringify(automation.action_config || {}));
            if (remappedActionConfig.actions && Array.isArray(remappedActionConfig.actions)) {
              remappedActionConfig.actions = remappedActionConfig.actions.map((action: { type: string; config?: { target_list_id?: string } }) => {
                if (action.type === 'move_task' && action.config?.target_list_id) {
                  const oldListId = action.config.target_list_id;
                  if (listIdToName[oldListId]) {
                    const listName = listIdToName[oldListId];
                    action.config.target_list_id = listNameToNewId[listName] || oldListId;
                  }
                }
                return action;
              });
            }

            return {
              template_id: id,
              description: automation.description,
              trigger: automation.trigger,
              action_type: automation.action_type,
              action_config: remappedActionConfig,
              scope_type: automation.scope_type,
              folder_ref_id: newFolderRefId,
              list_ref_id: newListRefId,
              enabled: automation.enabled,
            };
          }).filter(a => {
            // Filter out automations that lost their reference (folder/list was removed)
            if (a.scope_type === 'list' && !a.list_ref_id) return false;
            if (a.scope_type === 'folder' && !a.folder_ref_id) return false;
            return true;
          });

          if (remappedAutomations.length > 0) {
            const { error: automationsError } = await supabase
              .from('space_template_automations')
              .insert(remappedAutomations);

            if (automationsError) {
              console.error('Error restoring automations:', automationsError);
              // Don't throw - automations are secondary, main update succeeded
            }
          }
        }
      }

      return template;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      queryClient.invalidateQueries({ queryKey: ['space-template', data.id] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error: any) => {
      const code = error?.code as string | undefined;
      const msg = String(error?.message ?? '');
      const isPermission =
        code === '42501' ||
        code === 'PGRST116' ||
        /row-level security|permission denied|no.*rows/i.test(msg);
      toast.error(
        isPermission
          ? 'Você não tem permissão para editar este template'
          : 'Erro ao atualizar template',
      );
      console.error(error);
    },
  });
};

export const useDeleteSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('space_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      toast.success('Template excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir template');
      console.error(error);
    },
  });
};

export const useDuplicateSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch original template with structure
      const [templateResult, foldersResult, listsResult, tasksResult, automationsResult] = await Promise.all([
        supabase.from('space_templates').select('*').eq('id', templateId).single(),
        supabase.from('space_template_folders').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_lists').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_tasks').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_automations').select('*').eq('template_id', templateId),
      ]);

      if (templateResult.error) throw templateResult.error;

      const original = templateResult.data;

      // Create new template (global - sem workspace_id)
      const { data: newTemplate, error: newTemplateError } = await supabase
        .from('space_templates')
        .insert({
          created_by_user_id: user.id,
          name: `${original.name} (cópia)`,
          description: original.description,
          color: original.color,
          type: original.type || 'space',
        })
        .select()
        .single();

      if (newTemplateError) throw newTemplateError;

      // Map old folder IDs to new ones
      const folderIdMap: Record<string, string> = {};
      if (foldersResult.data && foldersResult.data.length > 0) {
        const { data: newFolders, error: foldersError } = await supabase
          .from('space_template_folders')
          .insert(
            foldersResult.data.map((f) => ({
              template_id: newTemplate.id,
              name: f.name,
              description: f.description,
              order_index: f.order_index,
            }))
          )
          .select();

        if (foldersError) throw foldersError;
        foldersResult.data.forEach((oldFolder, i) => {
          if (newFolders?.[i]) {
            folderIdMap[oldFolder.id] = newFolders[i].id;
          }
        });
      }

      // Map old list IDs to new ones
      const listIdMap: Record<string, string> = {};
      if (listsResult.data && listsResult.data.length > 0) {
        const { data: newLists, error: listsError } = await supabase
          .from('space_template_lists')
          .insert(
            listsResult.data.map((l) => ({
              template_id: newTemplate.id,
              folder_ref_id: l.folder_ref_id ? folderIdMap[l.folder_ref_id] : null,
              name: l.name,
              description: l.description,
              default_view: l.default_view,
              order_index: l.order_index,
              status_template_id: l.status_template_id || null,
            }))
          )
          .select();

        if (listsError) throw listsError;
        listsResult.data.forEach((oldList, i) => {
          if (newLists?.[i]) {
            listIdMap[oldList.id] = newLists[i].id;
          }
        });
      }

      // Copy tasks
      if (tasksResult.data && tasksResult.data.length > 0) {
        const { error: tasksError } = await supabase
          .from('space_template_tasks')
          .insert(
            tasksResult.data.map((t) => ({
              template_id: newTemplate.id,
              list_ref_id: listIdMap[t.list_ref_id],
              title: t.title,
              description: t.description,
              priority: t.priority,
              order_index: t.order_index,
              start_date_offset: t.start_date_offset,
              due_date_offset: t.due_date_offset,
              start_date_recurrence: t.start_date_recurrence,
              due_date_recurrence: t.due_date_recurrence,
              status_template_item_id: t.status_template_item_id,
              estimated_time: t.estimated_time,
              is_milestone: t.is_milestone,
              tag_names: t.tag_names,
            }))
          );

        if (tasksError) throw tasksError;
      }

      // Copy automations with ID remapping
      if (automationsResult.data && automationsResult.data.length > 0) {
        const remappedAutomations = automationsResult.data.map(a => {
          // Deep clone action_config and remap IDs
          const remappedConfig = JSON.parse(JSON.stringify(a.action_config || {}));
          if (remappedConfig.actions && Array.isArray(remappedConfig.actions)) {
            remappedConfig.actions = remappedConfig.actions.map((action: { type: string; config?: { target_list_id?: string } }) => {
              if (action.type === 'move_task' && action.config?.target_list_id) {
                const oldId = action.config.target_list_id;
                if (listIdMap[oldId]) {
                  action.config.target_list_id = listIdMap[oldId];
                }
              }
              return action;
            });
          }

          return {
            template_id: newTemplate.id,
            description: a.description,
            trigger: a.trigger,
            action_type: a.action_type,
            action_config: remappedConfig,
            scope_type: a.scope_type,
            folder_ref_id: a.folder_ref_id ? (folderIdMap[a.folder_ref_id] || null) : null,
            list_ref_id: a.list_ref_id ? (listIdMap[a.list_ref_id] || null) : null,
            enabled: false,
          };
        });

        const { error: automationsError } = await supabase
          .from('space_template_automations')
          .insert(remappedAutomations);

        if (automationsError) {
          console.error('Error duplicating automations:', automationsError);
        }
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      toast.success('Template duplicado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar template');
      console.error(error);
    },
  });
};

interface ApplySpaceTemplateInput {
  templateId: string;
  workspaceId: string;
  spaceName: string;
  spaceDescription?: string;
  spaceColor?: string;
}

export const useApplySpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      workspaceId,
      spaceName,
      spaceDescription,
      spaceColor,
    }: ApplySpaceTemplateInput) => {
      // Robust session verification with token refresh if needed
      let user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.user) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        user = refreshData.session.user;
      }

      // Check global roles first (global_owner, owner, admin have permission everywhere)
      const { data: globalRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasGlobalPermission = globalRoles?.some(r => 
        ['global_owner', 'owner', 'admin'].includes(r.role)
      );

      // If no global permission, verify workspace membership
      if (!hasGlobalPermission) {
        const { data: membership, error: membershipError } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single();

        if (!membership || membershipError) {
          throw new Error('Você não tem permissão para criar Spaces neste workspace. Por favor, selecione outro workspace.');
        }

        if (!['admin', 'member'].includes(membership.role)) {
          throw new Error('Apenas administradores e membros podem criar Spaces.');
        }
      }

      // Fetch template structure
      const [foldersResult, listsResult, tasksResult] = await Promise.all([
        supabase.from('space_template_folders').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_lists').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_tasks').select('*').eq('template_id', templateId).order('order_index'),
      ]);

      // Get default status for workspace (filter by scope_type to avoid multiple results)
      const { data: defaultStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('scope_type', 'workspace')
        .eq('is_default', true)
        .single();

      if (!defaultStatus) throw new Error('Status padrão não encontrado');

      // Extract company name from spaceName
      const extractCompanyName = (name: string): string => {
        const parts = name.split('|');
        return parts.length > 1 ? parts[parts.length - 1].trim() : name.trim();
      };
      const companyName = extractCompanyName(spaceName);

      // Create space using secure RPC function to bypass RLS issues
      const { data: spaceId, error: spaceError } = await supabase
        .rpc('create_space_secure', {
          p_workspace_id: workspaceId,
          p_name: spaceName,
          p_description: spaceDescription || null,
          p_color: spaceColor || null,
        });

      if (spaceError) {
        console.error('Erro ao criar space via RPC:', spaceError);
        throw new Error('Erro de permissão. Sua sessão pode ter expirado. Tente novamente.');
      }

      // Fetch the created space to get full data
      const { data: spaceData, error: fetchError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      if (fetchError || !spaceData) {
        throw new Error('Space criado mas não foi possível recuperar os dados');
      }

      const space = spaceData;

      // Map template folder IDs to real folder IDs
      const folderIdMap: Record<string, string> = {};
      if (foldersResult.data && foldersResult.data.length > 0) {
        for (const folder of foldersResult.data) {
          const { data: newFolder, error: folderError } = await supabase
            .from('folders')
            .insert({
              space_id: space.id,
              // IMPORTANT: Do NOT trim or add " | " - template name already includes " | " at the end
              name: `${folder.name}${companyName}`,
              description: folder.description,
            })
            .select()
            .single();

          if (folderError) throw folderError;
          folderIdMap[folder.id] = newFolder.id;
        }
      }

      // Map template list IDs to real list IDs
      const listIdMap: Record<string, string> = {};
      if (listsResult.data && listsResult.data.length > 0) {
        for (const list of listsResult.data) {
          const { data: newList, error: listError } = await supabase
            .from('lists')
            .insert({
              workspace_id: workspaceId,
              space_id: space.id,
              folder_id: list.folder_ref_id ? folderIdMap[list.folder_ref_id] : null,
              // IMPORTANT: Do NOT trim or add " | " - template name already includes " | " at the end
              name: `${list.name}${companyName}`,
              description: list.description,
              default_view: list.default_view as 'list' | 'kanban' | 'sprint',
              // Apply status template if configured
              status_template_id: list.status_template_id || null,
              status_source: list.status_template_id ? 'template' : 'inherit',
            })
            .select()
            .single();

          if (listError) throw listError;
          listIdMap[list.id] = newList.id;
        }
      }

      // Create tasks (módulo isolado de tarefas de modelo)
      if (tasksResult.data && tasksResult.data.length > 0) {
        const taskResult = await applyTemplateTasksToLists({
          templateId,
          workspaceId,
          listIdMap,
          createdByUserId: user.id,
          fallbackStatusId: defaultStatus.id,
          tasks: tasksResult.data as unknown as TemplateTaskRow[],
        });
        if (taskResult.errors.length > 0) {
          console.error('Erros ao criar tarefas do template:', taskResult.errors);
        }
      }

      // Fetch template automations and create real automations
      const { data: templateAutomations } = await supabase
        .from('space_template_automations')
        .select('*')
        .eq('template_id', templateId)
        .eq('enabled', true);

      if (templateAutomations && templateAutomations.length > 0) {
        // Build status ID map: status_template_item_id → real_status_id
        const statusIdMap: Record<string, string> = {};
        
        // For each list with a status template, fetch template items and real statuses
        for (const [templateListId, realListId] of Object.entries(listIdMap)) {
          const templateList = listsResult.data?.find(l => l.id === templateListId);
          if (templateList?.status_template_id) {
            // Fetch status template items
            const { data: templateStatusItems } = await supabase
              .from('status_template_items')
              .select('id, name')
              .eq('template_id', templateList.status_template_id);

            // Fetch real statuses created for this list
            const { data: realStatuses } = await supabase
              .from('statuses')
              .select('id, name, template_item_id')
              .eq('scope_type', 'list')
              .eq('scope_id', realListId);

            // Map by template_item_id first (more reliable), fallback to name matching
            templateStatusItems?.forEach(templateStatus => {
              // Try to find by template_item_id reference
              const byTemplateItemId = realStatuses?.find(s => s.template_item_id === templateStatus.id);
              if (byTemplateItemId) {
                statusIdMap[templateStatus.id] = byTemplateItemId.id;
              } else {
                // Fallback: match by name
                const byName = realStatuses?.find(s => s.name === templateStatus.name);
                if (byName) {
                  statusIdMap[templateStatus.id] = byName.id;
                }
              }
            });
          }
        }

        // Create automations with remapped IDs
        for (const automation of templateAutomations) {
          let scopeType: 'workspace' | 'space' | 'folder' | 'list';
          let scopeId: string;

          if (automation.scope_type === 'space') {
            scopeType = 'space';
            scopeId = space.id;
          } else if (automation.scope_type === 'folder' && automation.folder_ref_id) {
            scopeType = 'folder';
            scopeId = folderIdMap[automation.folder_ref_id];
          } else if (automation.scope_type === 'list' && automation.list_ref_id) {
            scopeType = 'list';
            scopeId = listIdMap[automation.list_ref_id];
          } else {
            // Default to space if scope not properly set
            scopeType = 'space';
            scopeId = space.id;
          }

          // Only create if we have a valid scopeId
          if (scopeId) {
            // Remap all IDs in action_config
            const remappedConfig = remapTemplateAutomationConfig(
              automation.action_config as Record<string, unknown> || {},
              listIdMap,
              statusIdMap
            ) as Database['public']['Tables']['automations']['Insert']['action_config'];

            await supabase.from('automations').insert([{
              workspace_id: workspaceId,
              description: automation.description,
              trigger: automation.trigger,
              action_type: automation.action_type,
              action_config: remappedConfig,
              scope_type: scopeType,
              scope_id: scopeId,
              enabled: true,
            }]);
          }
        }
      }

      return space;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', variables.workspaceId] });
      toast.success('Space criado a partir do template!');
    },
    onError: (error: any) => {
      console.error('Erro ao aplicar template:', error);
      
      if (error.code === '42501') {
        toast.error('Erro de permissão. Sua sessão pode ter expirado. Tente novamente.');
      } else if (error.message?.includes('Sessão expirada')) {
        toast.error('Sua sessão expirou. Faça login novamente.');
      } else if (error.message?.includes('permissão')) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao aplicar template. Tente novamente.');
      }
    },
  });
};

// Helper function to remap all IDs in template automation config
function remapTemplateAutomationConfig(
  actionConfig: Record<string, unknown>,
  listIdMap: Record<string, string>,
  statusIdMap: Record<string, string>
): Record<string, unknown> {
  // Deep clone to avoid mutation
  const remapped = JSON.parse(JSON.stringify(actionConfig));

  // 1. Remap trigger_config status IDs
  if (remapped.trigger_config) {
    if (Array.isArray(remapped.trigger_config.from_status_ids)) {
      remapped.trigger_config.from_status_ids = remapped.trigger_config.from_status_ids
        .map((id: string) => statusIdMap[id] || id)
        .filter(Boolean);
    }
    if (Array.isArray(remapped.trigger_config.to_status_ids)) {
      remapped.trigger_config.to_status_ids = remapped.trigger_config.to_status_ids
        .map((id: string) => statusIdMap[id] || id)
        .filter(Boolean);
    }
  }

  // 2. Remap actions
  if (remapped.actions && Array.isArray(remapped.actions)) {
    remapped.actions = remapped.actions.map((action: { type?: string; config?: { target_list_id?: string; status_id?: string } }) => {
      if (action.config) {
        // Remap target_list_id (for move_task actions)
        if (action.config.target_list_id && listIdMap[action.config.target_list_id]) {
          action.config.target_list_id = listIdMap[action.config.target_list_id];
        }
        // Remap status_id (for change_status actions)
        if (action.config.status_id && statusIdMap[action.config.status_id]) {
          action.config.status_id = statusIdMap[action.config.status_id];
        }
      }
      return action;
    });
  }

  // 3. Remap conditions (if they reference status IDs)
  if (remapped.conditions && Array.isArray(remapped.conditions)) {
    remapped.conditions = remapped.conditions.map((condition: { field?: string; value?: string | string[] }) => {
      if (condition.field === 'status_id' && condition.value) {
        if (Array.isArray(condition.value)) {
          condition.value = condition.value.map((id: string) => statusIdMap[id] || id);
        } else if (typeof condition.value === 'string' && statusIdMap[condition.value]) {
          condition.value = statusIdMap[condition.value];
        }
      }
      return condition;
    });
  }

  return remapped;
}

// Helper functions for mapping template refs to real IDs
function createFolderMap(
  templateFolders: { id: string; name: string }[] | null,
  realFolders: { id: string; name: string }[] | null
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!templateFolders || !realFolders) return map;

  for (const templateFolder of templateFolders) {
    // Template folder name ends with " | ", real folder name ends with " | ClientName"
    const basePattern = templateFolder.name;
    const matchingFolder = realFolders.find(f => f.name.startsWith(basePattern));
    if (matchingFolder) {
      map[templateFolder.id] = matchingFolder.id;
    }
  }
  return map;
}

function createListMap(
  templateLists: { id: string; name: string }[] | null,
  realLists: { id: string; name: string }[] | null
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!templateLists || !realLists) return map;

  for (const templateList of templateLists) {
    // Template list name ends with " | ", real list name ends with " | ClientName"
    const basePattern = templateList.name;
    const matchingList = realLists.find(l => l.name.startsWith(basePattern));
    if (matchingList) {
      map[templateList.id] = matchingList.id;
    }
  }
  return map;
}

interface TemplateAutomation {
  id: string;
  template_id: string;
  description: string | null;
  trigger: string;
  action_type: string;
  action_config: Record<string, unknown>;
  scope_type: string;
  folder_ref_id: string | null;
  list_ref_id: string | null;
  enabled: boolean;
}

function remapAutomation(
  automation: TemplateAutomation,
  folderIdMap: Record<string, string>,
  listIdMap: Record<string, string>,
  statusIdMap: Record<string, string>,
  spaceId: string,
  workspaceId: string
): Database['public']['Tables']['automations']['Insert'] | null {
  // Use the existing deep remap helper that handles trigger_config, actions, and conditions
  const remappedConfig = remapTemplateAutomationConfig(
    automation.action_config as Record<string, unknown>,
    listIdMap,
    statusIdMap
  );

  // Determine real scope_id
  let scopeId: string | null = spaceId;
  const scopeType = automation.scope_type as AutomationScopeType;

  if (automation.scope_type === 'list' && automation.list_ref_id) {
    scopeId = listIdMap[automation.list_ref_id] || null;
    if (!scopeId) return null;
  } else if (automation.scope_type === 'folder' && automation.folder_ref_id) {
    scopeId = folderIdMap[automation.folder_ref_id] || null;
    if (!scopeId) return null;
  } else if (automation.scope_type === 'space') {
    scopeId = spaceId;
  }

  return {
    workspace_id: workspaceId,
    description: automation.description,
    trigger: automation.trigger as AutomationTrigger,
    action_type: automation.action_type as AutomationActionType,
    action_config: remappedConfig as Json,
    scope_type: scopeType,
    scope_id: scopeId,
    enabled: true,
  };
}

interface ApplyAutomationsResult {
  spacesProcessed: number;
  automationsCreated: number;
  tasksCreated: number;
  errors: string[];
}

export const useApplyTemplateAutomationsToSpaces = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      workspaceId,
      spaceIds,
    }: {
      templateId: string;
      workspaceId: string;
      spaceIds: string[];
    }): Promise<ApplyAutomationsResult> => {
      const result: ApplyAutomationsResult = {
        spacesProcessed: 0,
        automationsCreated: 0,
        tasksCreated: 0,
        errors: [],
      };

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // 1. Fetch template structure
      const [templateFoldersResult, templateListsResult, templateAutomationsResult] = await Promise.all([
        supabase.from('space_template_folders').select('id, name').eq('template_id', templateId),
        supabase.from('space_template_lists').select('id, name, folder_ref_id').eq('template_id', templateId),
        supabase.from('space_template_automations').select('*').eq('template_id', templateId).eq('enabled', true),
      ]);

      const templateFolders = templateFoldersResult.data;
      const templateLists = templateListsResult.data;
      const templateAutomations = (templateAutomationsResult.data || []) as unknown as TemplateAutomation[];

      // Sem automações habilitadas não é erro: nada será criado, apenas os spaces são processados.

      // 2. Process each space
      for (const spaceId of spaceIds) {
        try {
          // Fetch real folders and lists for this space
          const { data: realFolders } = await supabase
            .from('folders')
            .select('id, name')
            .eq('space_id', spaceId);

          // Get all lists in this space (direct or inside folders)
          const folderIds = realFolders?.map(f => f.id) || [];
          let realLists: { id: string; name: string; folder_id: string | null }[] = [];

          if (folderIds.length > 0) {
            const { data: listsInFolders } = await supabase
              .from('lists')
              .select('id, name, folder_id')
              .in('folder_id', folderIds);
            realLists = listsInFolders || [];
          }

          const { data: listsDirectInSpace } = await supabase
            .from('lists')
            .select('id, name, folder_id')
            .eq('space_id', spaceId)
            .is('folder_id', null);

          realLists = [...realLists, ...(listsDirectInSpace || [])];

          // Fetch status template items for this template
          const { data: spaceTemplate } = await supabase
            .from('space_templates')
            .select('id')
            .eq('id', templateId)
            .single();

          // Get template lists WITH their status_template_id to build per-list status maps
          const { data: templateListsWithStatus } = await supabase
            .from('space_template_lists')
            .select('id, name, status_template_id')
            .eq('template_id', templateId);

          const statusTemplateIds = Array.from(new Set(
            (templateListsWithStatus || [])
              .map(l => l.status_template_id)
              .filter(Boolean) as string[]
          ));

          let allTemplateStatusItems: { id: string; name: string; template_id: string }[] = [];
          if (statusTemplateIds.length > 0) {
            const { data } = await supabase
              .from('status_template_items')
              .select('id, name, template_id')
              .in('template_id', statusTemplateIds);
            allTemplateStatusItems = data || [];
          }

          // Fetch real statuses for ALL lists in this space (per-list scope)
          const realListIds = realLists.map(l => l.id);
          let allRealStatuses: { id: string; name: string; scope_id: string | null; scope_type: string }[] = [];
          if (realListIds.length > 0) {
            const { data } = await supabase
              .from('statuses')
              .select('id, name, scope_id, scope_type')
              .in('scope_id', realListIds);
            allRealStatuses = data || [];
          }

          // Also fetch space-level and workspace-level statuses as fallback
          const { data: fallbackStatuses } = await supabase
            .from('statuses')
            .select('id, name, scope_id, scope_type')
            .eq('workspace_id', workspaceId)
            .in('scope_type', ['space', 'workspace']);
          const fallbackStatusList = fallbackStatuses || [];

          // Create ID maps
          const folderIdMap = createFolderMap(templateFolders, realFolders);
          const listIdMap = createListMap(templateLists, realLists);

          // Build statusIdMap PER LIST: for each template list, map its status template items
          // to the real statuses of the corresponding real list
          const statusIdMap: Record<string, string> = {};
          for (const tList of (templateListsWithStatus || [])) {
            if (!tList.status_template_id) continue;

            // Template status items for this list's status template
            const templateItems = allTemplateStatusItems.filter(
              item => item.template_id === tList.status_template_id
            );

            // Find the real list that corresponds to this template list
            const realListId = listIdMap[tList.id];

            // Real statuses for this specific list
            const realStatusesForList = realListId
              ? allRealStatuses.filter(s => s.scope_id === realListId)
              : [];

            for (const templateItem of templateItems) {
              // Try list-level match first, then fallback to space/workspace
              const match =
                realStatusesForList.find(
                  s => s.name.toLowerCase() === templateItem.name.toLowerCase()
                ) ||
                fallbackStatusList.find(
                  s => s.name.toLowerCase() === templateItem.name.toLowerCase()
                );
              if (match) {
                statusIdMap[templateItem.id] = match.id;
              }
            }
          }

          // 3. Create automations for this space
          for (const automation of templateAutomations) {
            const remapped = remapAutomation(automation, folderIdMap, listIdMap, statusIdMap, spaceId, workspaceId);
            if (remapped && remapped.scope_id) {
              const { error } = await supabase.from('automations').insert([remapped]);
              if (error) {
                result.errors.push(`Space ${spaceId}: ${error.message}`);
              } else {
                result.automationsCreated++;
              }
            }
          }

          // 4. Criar as tarefas do modelo nas listas correspondentes
          if (currentUser) {
            const taskResult = await applyTemplateTasksToLists({
              templateId,
              workspaceId,
              listIdMap,
              statusIdMap,
              createdByUserId: currentUser.id,
            });
            result.tasksCreated += taskResult.tasksCreated;
            result.errors.push(...taskResult.errors.map(e => `Space ${spaceId}: ${e}`));
          }

          result.spacesProcessed++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          result.errors.push(`Space ${spaceId}: ${errorMessage}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (result.errors.length === 0) {
        toast.success(
          `${result.automationsCreated} automações e ${result.tasksCreated} tarefas criadas em ${result.spacesProcessed} spaces!`
        );
      } else {
        toast.warning(`${result.automationsCreated} automações criadas, mas houve ${result.errors.length} erros.`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao aplicar automações');
      console.error(error);
    },
  });
};

// ---------------------------------------------------------------------------
// Aplicar automações de templates de Pasta / Lista em pastas ou listas reais
// ---------------------------------------------------------------------------

export interface ApplyAutomationsToScopesResult {
  targetsProcessed: number;
  automationsCreated: number;
  automationsReplaced: number;
  structuresCreated: number;
  tasksCreated: number;
  errors: string[];
}

export const useApplyTemplateAutomationsToScopes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      workspaceId,
      targetType,
      targetIds,
      createInSpaceIds = [],
    }: {
      templateId: string;
      workspaceId: string;
      targetType: 'folder' | 'list';
      targetIds: string[];
      /** Spaces onde as pastas/listas do modelo que não existirem devem ser criadas. */
      createInSpaceIds?: string[];
    }): Promise<ApplyAutomationsToScopesResult> => {
      const result: ApplyAutomationsToScopesResult = {
        targetsProcessed: 0,
        automationsCreated: 0,
        automationsReplaced: 0,
        structuresCreated: 0,
        tasksCreated: 0,
        errors: [],
      };

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const [templateFoldersResult, templateListsResult, templateAutomationsResult] = await Promise.all([
        supabase.from('space_template_folders').select('id, name').eq('template_id', templateId),
        supabase.from('space_template_lists').select('id, name, folder_ref_id, status_template_id').eq('template_id', templateId),
        supabase.from('space_template_automations').select('*').eq('template_id', templateId).eq('enabled', true),
      ]);

      const templateFolders = templateFoldersResult.data || [];
      const templateLists = templateListsResult.data || [];
      const templateAutomations = (templateAutomationsResult.data || []) as unknown as TemplateAutomation[];

      // Sem automações no modelo é permitido: a aplicação segue criando/validando a estrutura.



      // 0. Criar estrutura faltante nos spaces escolhidos
      const allTargetIds = [...targetIds];
      for (const spaceId of createInSpaceIds) {
        try {
          const { data: space } = await supabase
            .from('spaces')
            .select('id, name')
            .eq('id', spaceId)
            .single();
          if (!space) throw new Error('Space não encontrado');

          const { data: existingFolders } = await supabase
            .from('folders')
            .select('id, name')
            .eq('space_id', spaceId);
          const { data: existingLists } = await supabase
            .from('lists')
            .select('id, name, folder_id')
            .eq('space_id', spaceId);

          const realFolders = [...(existingFolders || [])];
          const realLists = [...(existingLists || [])];

          // Pastas do modelo
          const folderIdByRef: Record<string, string> = {};
          for (const tf of templateFolders) {
            const existing = realFolders.find(f => realMatchesTemplateName(tf.name, f.name));
            if (existing) {
              folderIdByRef[tf.id] = existing.id;
              continue;
            }
            const { data: created, error } = await supabase
              .from('folders')
              .insert({ space_id: spaceId, name: buildRealName(tf.name, space.name) })
              .select('id, name')
              .single();
            if (error || !created) throw new Error(error?.message || 'Falha ao criar pasta');
            folderIdByRef[tf.id] = created.id;
            realFolders.push(created);
            result.structuresCreated++;
            if (targetType === 'folder') allTargetIds.push(created.id);
          }
          if (targetType === 'folder') {
            for (const tf of templateFolders) {
              const id = folderIdByRef[tf.id];
              if (id && !allTargetIds.includes(id)) allTargetIds.push(id);
            }
          }

          // Listas do modelo
          for (const tl of templateLists) {
            const existing = realLists.find(l => realMatchesTemplateName(tl.name, l.name));
            if (existing) {
              if (targetType === 'list' && !allTargetIds.includes(existing.id)) allTargetIds.push(existing.id);
              continue;
            }
            const folderId = tl.folder_ref_id ? folderIdByRef[tl.folder_ref_id] ?? null : null;
            const { data: created, error } = await supabase
              .from('lists')
              .insert({
                workspace_id: workspaceId,
                space_id: spaceId,
                folder_id: folderId,
                name: buildRealName(tl.name, space.name),
                status_template_id: tl.status_template_id ?? null,
                status_source: tl.status_template_id ? 'template' : 'inherit',
              })
              .select('id, name, folder_id')
              .single();
            if (error || !created) throw new Error(error?.message || 'Falha ao criar lista');
            realLists.push(created);
            result.structuresCreated++;
            if (tl.status_template_id) {
              await supabase.rpc('sync_template_statuses_for_list', {
                p_list_id: created.id,
                p_template_id: tl.status_template_id,
                p_workspace_id: workspaceId,
              });
            }
            if (targetType === 'list') allTargetIds.push(created.id);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          result.errors.push(`Criação de estrutura no space ${spaceId}: ${message}`);
        }
      }

      const uniqueTargetIds = Array.from(new Set(allTargetIds));


      // Status template items usados pelas listas do template
      const statusTemplateIds = Array.from(new Set(
        templateLists.map(l => l.status_template_id).filter(Boolean) as string[]
      ));
      let allTemplateStatusItems: { id: string; name: string; template_id: string }[] = [];
      if (statusTemplateIds.length > 0) {
        const { data } = await supabase
          .from('status_template_items')
          .select('id, name, template_id')
          .in('template_id', statusTemplateIds);
        allTemplateStatusItems = data || [];
      }

      // Fallback de status a nível de space/workspace
      const { data: fallbackStatuses } = await supabase
        .from('statuses')
        .select('id, name, scope_id, scope_type')
        .eq('workspace_id', workspaceId)
        .in('scope_type', ['space', 'workspace']);
      const fallbackStatusList = fallbackStatuses || [];

      for (const targetId of uniqueTargetIds) {
        try {
          // 1. Listas reais associadas ao destino
          let realLists: { id: string; name: string; folder_id: string | null }[] = [];
          let targetFolderId: string | null = null;

          if (targetType === 'folder') {
            targetFolderId = targetId;
            const { data } = await supabase
              .from('lists')
              .select('id, name, folder_id')
              .eq('folder_id', targetId);
            realLists = data || [];

            // 1b. Criar as listas do modelo que ainda não existem nesta pasta.
            // As existentes são mantidas intactas (apenas casadas por nome).
            const { data: folderRow } = await supabase
              .from('folders')
              .select('id, space_id, spaces:space_id(name)')
              .eq('id', targetId)
              .maybeSingle();

            if (folderRow?.space_id) {
              const spaceName =
                (folderRow as unknown as { spaces?: { name?: string } | null }).spaces?.name || '';
              for (const tl of templateLists) {
                const existing = realLists.find(l => realMatchesTemplateName(tl.name, l.name));
                if (existing) continue;
                const { data: created, error } = await supabase
                  .from('lists')
                  .insert({
                    workspace_id: workspaceId,
                    space_id: folderRow.space_id,
                    folder_id: targetId,
                    name: buildRealName(tl.name, spaceName),
                    status_template_id: tl.status_template_id ?? null,
                    status_source: tl.status_template_id ? 'template' : 'inherit',
                  })
                  .select('id, name, folder_id')
                  .single();
                if (error || !created) {
                  result.errors.push(`Lista "${tl.name}": ${error?.message || 'falha ao criar'}`);
                  continue;
                }
                realLists.push(created);
                result.structuresCreated++;
                if (tl.status_template_id) {
                  await supabase.rpc('sync_template_statuses_for_list', {
                    p_list_id: created.id,
                    p_template_id: tl.status_template_id,
                    p_workspace_id: workspaceId,
                  });
                }
              }
            }
          } else {
            const { data } = await supabase
              .from('lists')
              .select('id, name, folder_id')
              .eq('id', targetId)
              .single();
            if (!data) throw new Error('Lista não encontrada');
            realLists = [data];
            targetFolderId = data.folder_id;
          }

          // 2. Mapas de IDs
          const folderIdMap: Record<string, string> = {};
          for (const tf of templateFolders) {
            if (targetFolderId) folderIdMap[tf.id] = targetFolderId;
          }

          const listIdMap: Record<string, string> = {};
          if (targetType === 'list') {
            // Todas as referências de lista do template apontam para a lista destino
            for (const tl of templateLists) listIdMap[tl.id] = targetId;
          } else {
            const byName = createListMap(templateLists, realLists);
            Object.assign(listIdMap, byName);
            // Fallback: template com uma única lista e pasta com uma única lista
            if (Object.keys(listIdMap).length === 0 && templateLists.length === 1 && realLists.length === 1) {
              listIdMap[templateLists[0].id] = realLists[0].id;
            }
          }

          // 3. Mapa de status
          const realListIds = realLists.map(l => l.id);
          let allRealStatuses: { id: string; name: string; scope_id: string | null }[] = [];
          if (realListIds.length > 0) {
            const { data } = await supabase
              .from('statuses')
              .select('id, name, scope_id')
              .in('scope_id', realListIds);
            allRealStatuses = data || [];
          }

          const statusIdMap: Record<string, string> = {};
          for (const tList of templateLists) {
            if (!tList.status_template_id) continue;
            const items = allTemplateStatusItems.filter(i => i.template_id === tList.status_template_id);
            const realListId = listIdMap[tList.id];
            const statusesForList = realListId
              ? allRealStatuses.filter(s => s.scope_id === realListId)
              : [];
            for (const item of items) {
              const match =
                statusesForList.find(s => s.name.toLowerCase() === item.name.toLowerCase()) ||
                fallbackStatusList.find(s => s.name.toLowerCase() === item.name.toLowerCase());
              if (match) statusIdMap[item.id] = match.id;
            }
          }

          // 4. Criar / substituir automações
          for (const automation of templateAutomations) {
            const remapped = remapAutomation(
              automation,
              folderIdMap,
              listIdMap,
              statusIdMap,
              targetId,
              workspaceId
            );
            if (!remapped) continue;

            if (targetType === 'list') {
              remapped.scope_type = 'list';
              remapped.scope_id = targetId;
            } else if (automation.scope_type !== 'list') {
              remapped.scope_type = 'folder';
              remapped.scope_id = targetId;
            }

            if (!remapped.scope_id) continue;

            // Sobrescrever: remove equivalentes já existentes no mesmo escopo
            let deleteQuery = supabase
              .from('automations')
              .delete()
              .eq('scope_type', remapped.scope_type)
              .eq('scope_id', remapped.scope_id)
              .eq('trigger', remapped.trigger)
              .eq('action_type', remapped.action_type);
            deleteQuery = remapped.description
              ? deleteQuery.eq('description', remapped.description)
              : deleteQuery.is('description', null);

            const { data: deleted } = await deleteQuery.select('id');
            result.automationsReplaced += deleted?.length || 0;

            const { error } = await supabase.from('automations').insert([remapped]);
            if (error) {
              result.errors.push(`${targetType === 'folder' ? 'Pasta' : 'Lista'} ${targetId}: ${error.message}`);
            } else {
              result.automationsCreated++;
            }
          }

          // 5. Criar as tarefas do modelo nas listas do destino
          if (currentUser) {
            const taskResult = await applyTemplateTasksToLists({
              templateId,
              workspaceId,
              listIdMap,
              statusIdMap,
              createdByUserId: currentUser.id,
            });
            result.tasksCreated += taskResult.tasksCreated;
            result.errors.push(
              ...taskResult.errors.map(e => `${targetType === 'folder' ? 'Pasta' : 'Lista'} ${targetId}: ${e}`)
            );
          }

          result.targetsProcessed++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          result.errors.push(`${targetType === 'folder' ? 'Pasta' : 'Lista'} ${targetId}: ${message}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (result.errors.length === 0) {
        toast.success(
          `${result.automationsCreated} automações e ${result.tasksCreated} tarefas aplicadas em ${result.targetsProcessed} destino(s)!`
        );
      } else {
        toast.warning(`${result.automationsCreated} automações aplicadas, mas houve ${result.errors.length} erro(s).`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao aplicar automações');
      console.error(error);
    },
  });
};

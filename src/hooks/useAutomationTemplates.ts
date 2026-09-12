import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { collectReferencedIds, remapAutomationConfig, realMatchesTemplateName } from '@/lib/templateAutomationMapping';
import { toast } from 'sonner';

export type AutomationTemplateTarget = 'space' | 'folder' | 'list';
type AutomationTrigger = Database['public']['Enums']['automation_trigger'];
type AutomationAction = Database['public']['Enums']['automation_action'];
type Json = Database['public']['Tables']['automation_template_rules']['Insert']['action_config'];

export interface AutomationTemplateModel {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  target_type: AutomationTemplateTarget;
  source_space_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationTemplateRule {
  id: string;
  automation_template_id: string;
  description: string | null;
  trigger: AutomationTrigger;
  action_type: AutomationAction;
  action_config: Record<string, any>;
  enabled: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const invalidateTemplates = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['automation-templates'] });
  queryClient.invalidateQueries({ queryKey: ['automation-template'] });
  queryClient.invalidateQueries({ queryKey: ['automation-template-rules'] });
};

export const useAutomationTemplates = (workspaceId?: string, targetType?: AutomationTemplateTarget) =>
  useQuery({
    queryKey: ['automation-templates', workspaceId, targetType],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from('automation_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');
      if (targetType) query = query.eq('target_type', targetType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AutomationTemplateModel[];
    },
    enabled: !!workspaceId,
  });

export const useAutomationTemplate = (templateId?: string) =>
  useQuery({
    queryKey: ['automation-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const { data, error } = await supabase.from('automation_templates').select('*').eq('id', templateId).single();
      if (error) throw error;
      return data as AutomationTemplateModel;
    },
    enabled: !!templateId,
  });

export const useAutomationTemplateRules = (templateId?: string) =>
  useQuery({
    queryKey: ['automation-template-rules', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from('automation_template_rules')
        .select('*')
        .eq('automation_template_id', templateId)
        .order('order_index')
        .order('created_at');
      if (error) throw error;
      return (data || []) as AutomationTemplateRule[];
    },
    enabled: !!templateId,
  });

export const useCreateAutomationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspaceId: string;
      name: string;
      description?: string;
      color?: string;
      targetType: AutomationTemplateTarget;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('automation_templates')
        .insert({
          workspace_id: input.workspaceId,
          created_by_user_id: auth.user.id,
          name: input.name,
          description: input.description || null,
          color: input.color || '#6366f1',
          target_type: input.targetType,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AutomationTemplateModel;
    },
    onSuccess: () => {
      invalidateTemplates(queryClient);
      toast.success('Modelo de automação criado!');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao criar modelo'),
  });
};

export const useUpdateAutomationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null; color?: string | null }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase.from('automation_templates').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as AutomationTemplateModel;
    },
    onSuccess: () => {
      invalidateTemplates(queryClient);
      toast.success('Modelo atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar modelo'),
  });
};

export const useDeleteAutomationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTemplates(queryClient);
      toast.success('Modelo excluído!');
    },
    onError: () => toast.error('Erro ao excluir modelo'),
  });
};

export const useDuplicateAutomationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Usuário não autenticado');
      const [templateResult, rulesResult] = await Promise.all([
        supabase.from('automation_templates').select('*').eq('id', templateId).single(),
        supabase.from('automation_template_rules').select('*').eq('automation_template_id', templateId).order('order_index'),
      ]);
      if (templateResult.error) throw templateResult.error;
      if (rulesResult.error) throw rulesResult.error;
      const source = templateResult.data;
      const { data: copy, error } = await supabase
        .from('automation_templates')
        .insert({
          workspace_id: source.workspace_id,
          created_by_user_id: auth.user.id,
          name: `${source.name} (cópia)`,
          description: source.description,
          color: source.color,
          target_type: source.target_type,
        })
        .select()
        .single();
      if (error) throw error;
      if (rulesResult.data?.length) {
        const { error: rulesError } = await supabase.from('automation_template_rules').insert(
          rulesResult.data.map((rule) => ({
            automation_template_id: copy.id,
            description: rule.description,
            trigger: rule.trigger,
            action_type: rule.action_type,
            action_config: rule.action_config,
            enabled: rule.enabled,
            order_index: rule.order_index,
          })),
        );
        if (rulesError) throw rulesError;
      }
      return copy;
    },
    onSuccess: () => {
      invalidateTemplates(queryClient);
      toast.success('Modelo duplicado!');
    },
    onError: () => toast.error('Erro ao duplicar modelo'),
  });
};

export const useCreateAutomationTemplateRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      automationTemplateId: string;
      description?: string;
      trigger: AutomationTrigger;
      actionType: AutomationAction;
      actionConfig: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('automation_template_rules')
        .insert({
          automation_template_id: input.automationTemplateId,
          description: input.description || null,
          trigger: input.trigger,
          action_type: input.actionType,
          action_config: input.actionConfig,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['automation-template-rules', input.automationTemplateId] });
      toast.success('Automação adicionada ao modelo!');
    },
    onError: () => toast.error('Erro ao adicionar automação'),
  });
};

export const useUpdateAutomationTemplateRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AutomationTemplateRule> & { id: string; automation_template_id: string }) => {
      const { id, automation_template_id, created_at, updated_at, ...updates } = input;
      const { data, error } = await supabase.from('automation_template_rules').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ['automation-template-rules', input.automation_template_id] }),
    onError: () => toast.error('Erro ao atualizar automação'),
  });
};

export const useDeleteAutomationTemplateRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; templateId: string }) => {
      const { error } = await supabase.from('automation_template_rules').delete().eq('id', input.id);
      if (error) throw error;
      return input.templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['automation-template-rules', templateId] });
      toast.success('Automação removida!');
    },
  });
};

export const useDuplicateAutomationTemplateRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: AutomationTemplateRule) => {
      const { error } = await supabase.from('automation_template_rules').insert({
        automation_template_id: rule.automation_template_id,
        description: rule.description ? `CLONE - ${rule.description}` : 'CLONE',
        trigger: rule.trigger,
        action_type: rule.action_type,
        action_config: rule.action_config,
        enabled: false,
        order_index: rule.order_index + 1,
      });
      if (error) throw error;
      return rule.automation_template_id;
    },
    onSuccess: (templateId) => queryClient.invalidateQueries({ queryKey: ['automation-template-rules', templateId] }),
  });
};

interface ApplyResult {
  targetsProcessed: number;
  automationsCreated: number;
  automationsReplaced: number;
  errors: string[];
}

async function buildConfigMaps(template: AutomationTemplateModel, targetId: string) {
  const empty = { listIdMap: {} as Record<string, string>, statusIdMap: {} as Record<string, string> };
  if (!template.source_space_template_id) return empty;

  const { data: sourceLists } = await supabase
    .from('space_template_lists')
    .select('id, name, status_template_id')
    .eq('template_id', template.source_space_template_id);
  if (!sourceLists?.length) return empty;

  let targetLists: { id: string; name: string }[] = [];
  if (template.target_type === 'list') {
    const { data } = await supabase.from('lists').select('id, name').eq('id', targetId).maybeSingle();
    if (data) targetLists = [data];
  } else if (template.target_type === 'folder') {
    const { data } = await supabase.from('lists').select('id, name').eq('folder_id', targetId);
    targetLists = data || [];
  } else {
    const { data } = await supabase.from('lists').select('id, name').eq('space_id', targetId);
    targetLists = data || [];
  }

  const listIdMap: Record<string, string> = {};
  for (const source of sourceLists) {
    const match = template.target_type === 'list'
      ? targetLists[0]
      : targetLists.find((target) => realMatchesTemplateName(source.name, target.name));
    if (match) listIdMap[source.id] = match.id;
  }

  const statusTemplateIds = sourceLists.map((list) => list.status_template_id).filter(Boolean) as string[];
  const mappedTargetListIds = Object.values(listIdMap);
  const [{ data: sourceStatuses }, { data: targetStatuses }] = await Promise.all([
    statusTemplateIds.length
      ? supabase.from('status_template_items').select('id, name, template_id').in('template_id', statusTemplateIds)
      : Promise.resolve({ data: [] }),
    mappedTargetListIds.length
      ? supabase.from('statuses').select('id, name, scope_id').in('scope_id', mappedTargetListIds)
      : Promise.resolve({ data: [] }),
  ]);
  const statusIdMap: Record<string, string> = {};
  for (const sourceStatus of sourceStatuses || []) {
    const sourceList = sourceLists.find((list) => list.status_template_id === sourceStatus.template_id);
    const targetListId = sourceList ? listIdMap[sourceList.id] : undefined;
    const match = (targetStatuses || []).find(
      (target) => target.scope_id === targetListId && target.name.trim().toLowerCase() === sourceStatus.name.trim().toLowerCase(),
    );
    if (match) statusIdMap[sourceStatus.id] = match.id;
  }
  return { listIdMap, statusIdMap };
}

export const useApplyAutomationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { template: AutomationTemplateModel; targetIds: string[] }): Promise<ApplyResult> => {
      const { data: rules, error } = await supabase
        .from('automation_template_rules')
        .select('*')
        .eq('automation_template_id', input.template.id)
        .eq('enabled', true)
        .order('order_index');
      if (error) throw error;
      const result: ApplyResult = { targetsProcessed: 0, automationsCreated: 0, automationsReplaced: 0, errors: [] };

      for (const targetId of input.targetIds) {
        const { listIdMap, statusIdMap } = await buildConfigMaps(input.template, targetId);
        for (const rule of rules || []) {
          const references = collectReferencedIds(rule.action_config as Record<string, unknown>);
          const missingLists = references.listIds.filter((id) => !listIdMap[id]);
          const missingStatuses = references.statusIds.filter((id) => !statusIdMap[id]);
          if (input.template.source_space_template_id && (missingLists.length || missingStatuses.length)) {
            result.errors.push(`${rule.description || rule.trigger}: referências não encontradas no destino ${targetId}.`);
            continue;
          }
          const config = remapAutomationConfig(rule.action_config as Record<string, unknown>, listIdMap, statusIdMap);
          let deleteQuery = supabase
            .from('automations')
            .delete()
            .eq('workspace_id', input.template.workspace_id)
            .eq('scope_type', input.template.target_type)
            .eq('scope_id', targetId)
            .eq('trigger', rule.trigger)
            .eq('action_type', rule.action_type);
          deleteQuery = rule.description ? deleteQuery.eq('description', rule.description) : deleteQuery.is('description', null);
          const { data: deleted, error: deleteError } = await deleteQuery.select('id');
          if (deleteError) {
            result.errors.push(`${targetId}: ${deleteError.message}`);
            continue;
          }
          result.automationsReplaced += deleted?.length || 0;
          const { error: insertError } = await supabase.from('automations').insert({
            workspace_id: input.template.workspace_id,
            description: rule.description,
            trigger: rule.trigger,
            action_type: rule.action_type,
            action_config: config as Json,
            scope_type: input.template.target_type,
            scope_id: targetId,
            enabled: true,
          });
          if (insertError) result.errors.push(`${targetId}: ${insertError.message}`);
          else result.automationsCreated++;
        }
        result.targetsProcessed++;
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      if (result.errors.length) toast.warning(`${result.automationsCreated} automações aplicadas com ${result.errors.length} aviso(s).`);
      else toast.success(`${result.automationsCreated} automações aplicadas em ${result.targetsProcessed} destino(s)!`);
    },
    onError: () => toast.error('Erro ao aplicar modelo de automação'),
  });
};
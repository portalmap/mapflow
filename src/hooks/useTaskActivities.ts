// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDate } from '@/lib/dateUtils';

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  activity_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTaskActivities = (taskId?: string) => {
  return useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      // Buscar atividades
      const { data: activities, error } = await supabase
        .from('task_activities')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!activities) return [];

      // Buscar perfis dos usuários
      const userIds = [...new Set(activities.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Mapear perfis
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return activities.map(activity => ({
        ...activity,
        user: profileMap.get(activity.user_id) || null,
      })) as TaskActivity[];
    },
    enabled: !!taskId,
  });
};

export const useCreateTaskActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      activityType,
      fieldName,
      oldValue,
      newValue,
      metadata,
    }: {
      taskId: string;
      activityType: string;
      fieldName?: string | null;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('task_activities')
        .insert({
          task_id: taskId,
          user_id: user.id,
          activity_type: activityType,
          field_name: fieldName || null,
          old_value: oldValue || null,
          new_value: newValue || null,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.task_id] });
    },
  });
};

export const useUpdateActivityMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activityId,
      metadata,
      activityType,
    }: {
      activityId: string;
      metadata: Record<string, any>;
      activityType?: string;
    }) => {
      const updateData: Record<string, any> = { metadata };
      if (activityType) {
        updateData.activity_type = activityType;
      }
      const { data, error } = await supabase
        .from('task_activities')
        .update(updateData)
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.task_id] });
    },
  });
};

// Helpers para traduzir tipos de atividade
export const getActivityLabel = (activity: TaskActivity): string => {
  // Handle assignee activities
  if (activity.activity_type === 'assignee.added') {
    return `adicionou ${activity.new_value || 'um responsável'}`;
  }
  if (activity.activity_type === 'assignee.removed') {
    return `removeu ${activity.old_value || 'um responsável'}`;
  }
  // Handle productivity classified with transfer context
  if (activity.activity_type === 'productivity.classified' && activity.metadata?.isTransferred) {
    const classLabel = activity.new_value === 'early' ? 'Antecipada' 
      : activity.new_value === 'on_time' ? 'Em dia' 
      : 'Atrasada';
    const score = activity.metadata?.productivityScore != null 
      ? ` (${Math.round(activity.metadata.productivityScore)}%)` 
      : '';
    const userName = activity.metadata?.userName || '';
    return `transferência de ${userName} classificada como ${classLabel}${score}`;
  }
  if (activity.activity_type === 'attachment.removed') {
    const fileName = activity.metadata?.file_name || activity.old_value || 'arquivo';
    const asAdmin = activity.metadata?.removed_by_admin ? ' (como administrador)' : '';
    return `removeu o anexo "${fileName}"${asAdmin}`;
  }

  const type = activity.activity_type;
  const isAutomation = activity.metadata?.created_by === 'automation';
  const automationName = activity.metadata?.automation_name;
  
  // Prefixo para automações
  const prefix = isAutomation && automationName ? `[${automationName}] ` : '';
  
  switch (type) {
    case 'task.created': {
      const createdDate = activity.metadata?.created_at_date;
      const integrationLabel = activity.metadata?.integration_label;
      const viaIntegration = integrationLabel
        ? ` via Integração "${integrationLabel}"`
        : '';
      if (createdDate) {
        const formatted = new Date(createdDate).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        return `${prefix}criou esta tarefa${viaIntegration} em ${formatted}`;
      }
      return `${prefix}criou esta tarefa${viaIntegration}`;
    }
    case 'status.changed':
      return `${prefix}alterou o status de "${activity.old_value || 'Sem status'}" para "${activity.new_value}"`;
    case 'priority.changed':
      return `${prefix}alterou a prioridade de "${getPriorityLabel(activity.old_value)}" para "${getPriorityLabel(activity.new_value)}"`;
    case 'assignee.changed':
      if (!activity.old_value && activity.new_value) {
        return `${prefix}atribuiu a tarefa para "${activity.new_value}"`;
      } else if (activity.old_value && !activity.new_value) {
        return `${prefix}removeu a atribuição de "${activity.old_value}"`;
      }
      return `${prefix}alterou o responsável de "${activity.old_value}" para "${activity.new_value}"`;
    case 'assignee.added':
      return `${prefix}adicionou "${activity.new_value}" como responsável`;
    case 'due_date.changed':
      if (!activity.old_value && activity.new_value) {
        return `${prefix}definiu a data de entrega para ${formatDate(activity.new_value)}`;
      } else if (activity.old_value && !activity.new_value) {
        return `${prefix}removeu a data de entrega`;
      }
      return `${prefix}alterou a data de entrega de ${formatDate(activity.old_value)} para ${formatDate(activity.new_value)}`;
    case 'start_date.changed':
      if (!activity.old_value && activity.new_value) {
        return `${prefix}definiu a data de início para ${formatDate(activity.new_value)}`;
      } else if (activity.old_value && !activity.new_value) {
        return `${prefix}removeu a data de início`;
      }
      return `${prefix}alterou a data de início de ${formatDate(activity.old_value)} para ${formatDate(activity.new_value)}`;
    case 'title.changed':
      return `${prefix}alterou o título de "${activity.old_value}" para "${activity.new_value}"`;
    case 'description.changed':
      return activity.new_value ? `${prefix}atualizou a descrição` : `${prefix}removeu a descrição`;
    case 'comment.created':
      if (activity.metadata?.edited_at) {
        return `${prefix}adicionou um comentário (editado)`;
      }
      return `${prefix}adicionou um comentário`;
    case 'comment.edited':
      return `${prefix}editou um comentário`; // Fallback para atividades antigas
    case 'assignment.created':
      return `${prefix}criou uma atribuição para "${activity.metadata?.assignee_name || 'usuário'}"`;
    case 'assignment.resolved':
      return `${prefix}resolveu a atribuição de "${activity.metadata?.assignee_name || 'usuário'}"`;
    case 'tag.added':
      return `${prefix}adicionou a etiqueta "${activity.metadata?.tag_name || activity.new_value || ''}"`;
    case 'tag.removed': {
      const tagName = activity.metadata?.tag_name || activity.old_value || '';
      if (activity.metadata?.origem === 'portal-map' || activity.metadata?.origem === 'hub') {
        return `${prefix}removeu a etiqueta "${tagName}" (via Portal MAP)`;
      }
      return `${prefix}removeu a etiqueta "${tagName}"`;
    }
    case 'attachment.added':
      return `${prefix}anexou "${activity.metadata?.file_name || 'arquivo'}"`;
    case 'subtask.created':
      return `${prefix}criou a subtarefa "${activity.metadata?.subtask_title || ''}"`;
    case 'subtask.deleted':
      return `${prefix}excluiu a subtarefa "${activity.metadata?.subtask_title || ''}"`;
    case 'checklist.created':
      return `${prefix}criou o checklist "${activity.metadata?.checklist_title || ''}"`;
    case 'checklist.item.created':
      return `${prefix}adicionou item "${activity.metadata?.item_content || ''}" ao checklist`;
    case 'checklist.item.completed':
      return `${prefix}marcou "${activity.metadata?.item_name || ''}" como concluído`;
    case 'checklist.item.uncompleted':
      return `${prefix}desmarcou "${activity.metadata?.item_name || ''}"`;
    case 'subtask.completed':
      return `${prefix}marcou a subtarefa "${activity.metadata?.subtask_title || ''}" como concluída`;
    case 'subtask.uncompleted':
      return `${prefix}desmarcou a subtarefa "${activity.metadata?.subtask_title || ''}"`;
    case 'checklist.deleted':
      return `${prefix}excluiu o checklist "${activity.metadata?.checklist_title || ''}" (${activity.metadata?.items_count || 0} itens)`;
    case 'task.archived':
      return `${prefix}arquivou a tarefa`;
    case 'task.moved':
      if (activity.old_value && activity.new_value) {
        return `${prefix}moveu a tarefa de "${activity.old_value}" para "${activity.new_value}"`;
      }
      return `${prefix}moveu a tarefa para outra lista`;
    case 'productivity.classified': {
      const classLabel = activity.new_value === 'early' ? 'Antecipada' 
        : activity.new_value === 'on_time' ? 'Em dia' 
        : 'Atrasada';
      return `${prefix}tarefa classificada como ${classLabel}`;
    }
    case 'productivity.validated': {
      const valLabel = activity.new_value === 'early' ? 'Antecipada' 
        : activity.new_value === 'on_time' ? 'Em dia' 
        : 'Atrasada';
      return `${prefix}validou a classificação como ${valLabel}`;
    }
    default:
      return type;
  }
};

// Verificar se atividade foi criada por automação
export const isAutomationActivity = (activity: TaskActivity): boolean => {
  return activity.metadata?.created_by === 'automation';
};

const getPriorityLabel = (priority: string | null): string => {
  switch (priority) {
    case 'low': return 'Baixa';
    case 'medium': return 'Média';
    case 'high': return 'Alta';
    case 'urgent': return 'Urgente';
    default: return priority || 'Sem prioridade';
  }
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    const parsed = parseLocalDate(dateStr);
    return parsed ? parsed.toLocaleDateString('pt-BR') : dateStr;
  } catch {
    return dateStr;
  }
};

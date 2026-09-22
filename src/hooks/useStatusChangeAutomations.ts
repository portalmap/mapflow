import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { applyAutomationsToTask } from './useApplyAutomations';

interface StatusChangeInfo {
  taskId: string;
  workspaceId: string;
  listId: string;
  oldStatusId: string;
  newStatusId: string;
}

interface AutomationExecutionResult {
  automationsExecuted: number;
  subtasksCreated: number;
  errors: string[];
}

interface AutomationCondition {
  id: string;
  field: 'tag' | 'priority' | 'assignee' | 'due_date' | 'has_subtasks';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_set' | 'is_not_set' | 'any_of' | 'none_of';
  value: string | string[];
  logic: 'AND' | 'OR';
}

interface TaskData {
  id: string;
  priority: string;
  due_date: string | null;
  tags: string[];
  assignees: string[];
  hasSubtasks: boolean;
}

// Helper para registrar atividade de automação
const logAutomationActivity = async (
  taskId: string,
  userId: string,
  activityType: string,
  options: {
    fieldName?: string;
    oldValue?: string | null;
    newValue?: string | null;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> => {
  try {
    await supabase.from('task_activities').insert({
      task_id: taskId,
      user_id: userId,
      activity_type: activityType,
      field_name: options.fieldName || null,
      old_value: options.oldValue || null,
      new_value: options.newValue || null,
      metadata: { ...options.metadata, created_by: 'automation' },
    });
  } catch (error) {
    console.error('Erro ao registrar atividade de automação:', error);
  }
};

/**
 * Evaluate a single condition against task data
 */
const evaluateSingleCondition = (condition: AutomationCondition, taskData: TaskData): boolean => {
  const values = Array.isArray(condition.value) ? condition.value : [condition.value].filter(Boolean);

  switch (condition.field) {
    case 'priority':
      switch (condition.operator) {
        case 'equals':
          return values.includes(taskData.priority);
        case 'not_equals':
          return !values.includes(taskData.priority);
        case 'any_of':
          return values.some(v => v === taskData.priority);
        default:
          return true;
      }

    case 'tag':
      switch (condition.operator) {
        case 'contains':
          return values.some(v => taskData.tags.includes(v));
        case 'not_contains':
          return !values.some(v => taskData.tags.includes(v));
        case 'any_of':
          return values.some(v => taskData.tags.includes(v));
        case 'none_of':
          return !values.some(v => taskData.tags.includes(v));
        default:
          return true;
      }

    case 'assignee':
      switch (condition.operator) {
        case 'is_set':
          return taskData.assignees.length > 0;
        case 'is_not_set':
          return taskData.assignees.length === 0;
        case 'contains':
          return values.some(v => taskData.assignees.includes(v));
        case 'not_contains':
          return !values.some(v => taskData.assignees.includes(v));
        default:
          return true;
      }

    case 'due_date':
      switch (condition.operator) {
        case 'is_set':
          return !!taskData.due_date;
        case 'is_not_set':
          return !taskData.due_date;
        default:
          return true;
      }

    case 'has_subtasks':
      switch (condition.operator) {
        case 'is_set':
          return taskData.hasSubtasks;
        case 'is_not_set':
          return !taskData.hasSubtasks;
        default:
          return true;
      }

    default:
      return true;
  }
};

/**
 * Evaluate all conditions with AND/OR logic
 */
const evaluateConditions = (conditions: AutomationCondition[], taskData: TaskData): boolean => {
  if (!conditions || conditions.length === 0) return true;

  let result = evaluateSingleCondition(conditions[0], taskData);

  for (let i = 1; i < conditions.length; i++) {
    const prevCondition = conditions[i - 1];
    const currentCondition = conditions[i];
    const currentResult = evaluateSingleCondition(currentCondition, taskData);

    if (prevCondition.logic === 'AND') {
      result = result && currentResult;
    } else {
      result = result || currentResult;
    }
  }

  return result;
};

/**
 * Fetch task data needed for condition evaluation
 */
const fetchTaskData = async (taskId: string): Promise<TaskData | null> => {
  try {
    // Fetch task basic info
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, priority, due_date')
      .eq('id', taskId)
      .single();

    if (taskError || !task) return null;

    // Fetch tags
    const { data: tagRelations } = await supabase
      .from('task_tag_relations')
      .select('tag:task_tags(name)')
      .eq('task_id', taskId);

    const tags = tagRelations?.map((tr: any) => tr.tag?.name).filter(Boolean) || [];

    // Fetch assignees
    const { data: assigneeData } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId);

    const assignees = assigneeData?.map(a => a.user_id) || [];

    // Check for subtasks
    const { count: subtaskCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', taskId);

    return {
      id: task.id,
      priority: task.priority,
      due_date: task.due_date,
      tags,
      assignees,
      hasSubtasks: (subtaskCount || 0) > 0,
    };
  } catch (error) {
    console.error('Error fetching task data for conditions:', error);
    return null;
  }
};

/**
 * Executes automations triggered by status changes
 */
const invalidateAutomationQueries = (queryClient: QueryClient, taskId: string) => {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  queryClient.invalidateQueries({ queryKey: ['subtasks'] });
  queryClient.invalidateQueries({ queryKey: ['task-tag-relations'] });
  queryClient.invalidateQueries({ queryKey: ['task-assignees'] });
  queryClient.invalidateQueries({ queryKey: ['task-activities'] });
};

/**
 * Compute Nth weekday of a month. ordinal: 1..4 for first..fourth, -1 for last.
 * weekday: 0 (Sun) .. 6 (Sat)
 */
const computeWeekdayOrdinal = (year: number, month: number, ordinal: number, weekday: number): Date => {
  if (ordinal === -1) {
    // last weekday of month
    const lastDay = new Date(year, month + 1, 0);
    const diff = (lastDay.getDay() - weekday + 7) % 7;
    return new Date(year, month, lastDay.getDate() - diff);
  }
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  let day = 1 + offset + (Math.max(1, ordinal) - 1) * 7;
  const lastDay = new Date(year, month + 1, 0).getDate();
  if (day > lastDay) day -= 7; // fallback to last available occurrence
  return new Date(year, month, day);
};

/**
 * Calculate next dates based on recurrence config
 */
const calculateNextDates = (
  currentStartDate: string | null,
  currentDueDate: string | null,
  config: Record<string, any>
): { startDate: string | null; dueDate: string | null } => {
  const now = new Date();
  const recurrenceType = config.recurrence_type;
  const skipWeekends = config.skip_weekends || false;

  // Calculate interval between start and due
  let intervalDays = 0;
  if (currentStartDate && currentDueDate) {
    const s = new Date(currentStartDate + 'T00:00:00');
    const d = new Date(currentDueDate + 'T00:00:00');
    intervalDays = Math.round((d.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  }

  let nextDate = new Date(now);

  const dayOfWeekMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  switch (recurrenceType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly': {
      const targetDay = dayOfWeekMap[config.day_of_week || 'monday'];
      nextDate.setDate(nextDate.getDate() + ((7 + targetDay - nextDate.getDay()) % 7 || 7));
      break;
    }
    case 'biweekly': {
      const targetDay2 = dayOfWeekMap[config.day_of_week || 'monday'];
      nextDate.setDate(nextDate.getDate() + ((7 + targetDay2 - nextDate.getDay()) % 7 || 7) + 7);
      break;
    }
    case 'monthly': {
      const mode = config.monthly_mode || 'first_day';
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (mode === 'first_day') nextDate.setDate(1);
      else if (mode === 'last_day') { nextDate.setMonth(nextDate.getMonth() + 1); nextDate.setDate(0); }
      else if (mode === 'specific_day') nextDate.setDate(Math.min(config.day_of_month || 1, 28));
      else if (mode === 'weekday_ordinal') {
        nextDate = computeWeekdayOrdinal(nextDate.getFullYear(), nextDate.getMonth(), config.weekday_ordinal ?? 1, dayOfWeekMap[config.weekday || 'monday']);
      }
      break;
    }
    case 'quarterly': {
      const mode2 = config.monthly_mode || 'first_day';
      nextDate.setMonth(nextDate.getMonth() + 3);
      if (mode2 === 'first_day') nextDate.setDate(1);
      else if (mode2 === 'last_day') { nextDate.setMonth(nextDate.getMonth() + 1); nextDate.setDate(0); }
      else if (mode2 === 'specific_day') nextDate.setDate(Math.min(config.day_of_month || 1, 28));
      else if (mode2 === 'weekday_ordinal') {
        nextDate = computeWeekdayOrdinal(nextDate.getFullYear(), nextDate.getMonth(), config.weekday_ordinal ?? 1, dayOfWeekMap[config.weekday || 'monday']);
      }
      break;
    }
  }

  // Skip weekends
  if (skipWeekends) {
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
  }

  const nextStartDate = nextDate.toISOString().split('T')[0];
  let nextDueDate: string | null = null;
  if (intervalDays > 0) {
    const due = new Date(nextDate);
    due.setDate(due.getDate() + intervalDays);
    if (skipWeekends) {
      while (due.getDay() === 0 || due.getDay() === 6) {
        due.setDate(due.getDate() + 1);
      }
    }
    nextDueDate = due.toISOString().split('T')[0];
  }

  return {
    startDate: currentStartDate ? nextStartDate : null,
    dueDate: currentDueDate ? (nextDueDate || nextStartDate) : null,
  };
};

/**
 * Execute task-level recurrence when status changes to the trigger status
 */
const executeTaskRecurrence = async (
  info: StatusChangeInfo,
  queryClient?: QueryClient
): Promise<boolean> => {
  // Fetch task with recurrence_config
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', info.taskId)
    .single();

  if (error || !task) return false;

  const recConfig = task.recurrence_config as Record<string, any> | null;
  if (!recConfig || !recConfig.trigger_on_status_id) return false;

  // Check if new status matches trigger
  if (info.newStatusId !== recConfig.trigger_on_status_id) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const nextDates = calculateNextDates(task.start_date, task.due_date, recConfig);

  if (recConfig.on_complete_action === 'create_new_task') {
    // Find default/first active status for the list
    const { data: defaultStatus } = await supabase
      .from('statuses')
      .select('id')
      .eq('scope_id', task.list_id)
      .eq('scope_type', 'list')
      .eq('is_default', true)
      .maybeSingle();

    let newStatusId = defaultStatus?.id;
    if (!newStatusId) {
      const { data: firstStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('scope_id', task.list_id)
        .eq('scope_type', 'list')
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();
      newStatusId = firstStatus?.id || task.status_id;
    }

    // Create new task (duplicate)
    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert({
        workspace_id: task.workspace_id,
        list_id: task.list_id,
        status_id: newStatusId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignee_id: task.assignee_id,
        start_date: nextDates.startDate,
        due_date: nextDates.dueDate,
        created_by_user_id: user.id,
        recurrence_config: recConfig,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating recurring task:', createError);
      return false;
    }

    // Copy assignees to new task
    const { data: assignees } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', info.taskId);

    if (assignees && assignees.length > 0) {
      await supabase.from('task_assignees').insert(
        assignees.map(a => ({ task_id: newTask.id, user_id: a.user_id }))
      );
    }

    // Log activity
    await logAutomationActivity(info.taskId, user.id, 'recurrence.executed', {
      metadata: {
        action: 'create_new_task',
        new_task_id: newTask.id,
        recurrence_type: recConfig.recurrence_type,
      },
    });

    console.log(`Recurrence: created new task ${newTask.id} from ${info.taskId}`);
  } else if (recConfig.on_complete_action === 'update_status') {
    const resetStatusId = recConfig.reset_status_id;
    if (!resetStatusId) return false;

    const updateData: any = { status_id: resetStatusId, completed_at: null };
    if (nextDates.startDate) updateData.start_date = nextDates.startDate;
    if (nextDates.dueDate) updateData.due_date = nextDates.dueDate;

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', info.taskId);

    if (updateError) {
      console.error('Error resetting recurring task:', updateError);
      return false;
    }

    // Log activity
    await logAutomationActivity(info.taskId, user.id, 'recurrence.executed', {
      metadata: {
        action: 'update_status',
        reset_status_id: resetStatusId,
        recurrence_type: recConfig.recurrence_type,
      },
    });

    console.log(`Recurrence: reset task ${info.taskId} to status ${resetStatusId}`);
  }

  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['task', info.taskId] });
    queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
  }

  return true;
};

export const executeStatusChangeAutomations = async (
  info: StatusChangeInfo,
  queryClient?: QueryClient
): Promise<AutomationExecutionResult> => {
  const result: AutomationExecutionResult = {
    automationsExecuted: 0,
    subtasksCreated: 0,
    errors: [],
  };

  try {
    // 1. Get the list hierarchy for scope filtering
    const { data: list } = await supabase
      .from('lists')
      .select('id, space_id, folder_id')
      .eq('id', info.listId)
      .single();

    if (!list) return result;

    // 2. Build scope IDs for filtering
    const scopeIds: string[] = [info.workspaceId];
    if (list.space_id) scopeIds.push(list.space_id);
    if (list.folder_id) scopeIds.push(list.folder_id);
    scopeIds.push(info.listId);

    // 3. Fetch automations that might match 'on_status_changed' (including via or_triggers)
    // We fetch all enabled automations for the workspace and filter client-side
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('enabled', true)
      .eq('workspace_id', info.workspaceId);

    if (error || !automations) {
      console.error('Error fetching status change automations:', error);
      return result;
    }

    // Filter to only automations whose trigger or or_triggers include 'on_status_changed'
    const statusAutomations = automations.filter(a => {
      const config = a.action_config as Record<string, any> | null;
      const orTriggers = (config?.or_triggers as string[] | undefined) || [];
      return a.trigger === 'on_status_changed' || orTriggers.includes('on_status_changed');
    });

    // 4. Filter automations by matching scopes
    const applicableAutomations = statusAutomations.filter((automation) => {
      // Workspace-level automations
      if (!automation.scope_id && automation.scope_type === 'workspace') {
        return true;
      }
      // Other scopes - check if scope_id matches any in hierarchy
      return automation.scope_id && scopeIds.includes(automation.scope_id);
    });

    console.log(`Found ${applicableAutomations.length} applicable automations for status change`);

    // 5. Fetch task data once for condition evaluation
    let taskData: TaskData | null = null;

    // 6. Execute each automation
    for (const automation of applicableAutomations) {
      try {
        const actionConfig = automation.action_config as Record<string, any> | null;

        // Check if automation has status filter conditions (multi-select support)
        const triggerConfig = actionConfig?.trigger_config;
        if (triggerConfig) {
          // Support both legacy single ID and new array format
          const fromStatusIds: string[] = triggerConfig.from_status_ids || 
            (triggerConfig.from_status_id ? [triggerConfig.from_status_id] : []);
          const toStatusIds: string[] = triggerConfig.to_status_ids || 
            (triggerConfig.to_status_id ? [triggerConfig.to_status_id] : []);
          
          // Skip if from_status doesn't match (and it's specified)
          if (fromStatusIds.length > 0 && !fromStatusIds.includes(info.oldStatusId)) {
            continue;
          }
          // Skip if to_status doesn't match (and it's specified)
          if (toStatusIds.length > 0 && !toStatusIds.includes(info.newStatusId)) {
            continue;
          }
        }

        // Check conditions
        const conditions = actionConfig?.conditions as AutomationCondition[] | undefined;
        if (conditions && conditions.length > 0) {
          // Fetch task data if not already fetched
          if (!taskData) {
            taskData = await fetchTaskData(info.taskId);
          }
          
          if (!taskData) {
            console.error('Could not fetch task data for condition evaluation');
            continue;
          }

          const conditionsMet = evaluateConditions(conditions, taskData);
          if (!conditionsMet) {
            console.log(`Conditions not met for automation ${automation.id}`);
            continue;
          }
        }

        // === DEDUPLICATION GUARD (5-second window) ===
        const { data: existingExecution } = await supabase
          .from('automation_executions')
          .select('id')
          .eq('automation_id', automation.id)
          .eq('task_id', info.taskId)
          .eq('status_id', info.newStatusId)
          .gte('executed_at', new Date(Date.now() - 5000).toISOString())
          .maybeSingle();

        if (existingExecution) {
          console.log(`Status automation ${automation.id} recently executed for task ${info.taskId}, skipping duplicate`);
          continue;
        }

        // Record execution BEFORE running actions to prevent concurrent duplicates
        await supabase.from('automation_executions').insert({
          automation_id: automation.id,
          task_id: info.taskId,
          status_id: info.newStatusId,
        });

        const automationName = automation.description || `Automação ${automation.id.slice(0, 8)}`;
        
        // Check if automation has multiple actions
        const actionsArray = actionConfig?.actions as Array<{ type: string; config: Record<string, any> }> | undefined;
        
        const originalListId = info.listId;

        if (actionsArray && actionsArray.length > 0) {
          // Execute multiple actions sequentially
          for (const action of actionsArray) {
            await executeAction(action.type, info, action.config, automationName);
          }
        } else {
          // Execute single action (legacy support)
          await executeAction(automation.action_type, info, actionConfig, automationName);
        }

        // Apply destination list automations AFTER all actions complete
        if (info.listId !== originalListId) {
          console.log(`Task moved from list ${originalListId} to ${info.listId}, applying destination automations...`);
          try {
            await applyAutomationsToTask({
              id: info.taskId,
              workspace_id: info.workspaceId,
              list_id: info.listId,
            });
          } catch (applyError) {
            console.error('Error applying destination list automations:', applyError);
          }
        }
        
        result.automationsExecuted++;

        if (automation.action_type === 'create_subtask' || 
            actionsArray?.some(a => a.type === 'create_subtask')) {
          result.subtasksCreated++;
        }
      } catch (actionError) {
        console.error(`Error executing automation ${automation.id}:`, actionError);
        result.errors.push(`Automation ${automation.id}: ${actionError}`);
      }
    }

    // === TASK-LEVEL RECURRENCE ===
    try {
      const recurrenceResult = await executeTaskRecurrence(info, queryClient);
      if (recurrenceResult) {
        result.automationsExecuted++;
      }
    } catch (recurrenceError) {
      console.error('Error executing task recurrence:', recurrenceError);
      result.errors.push(`Task recurrence: ${recurrenceError}`);
    }

    if (queryClient && result.automationsExecuted > 0) {
      invalidateAutomationQueries(queryClient, info.taskId);
    }

    return result;
  } catch (error) {
    console.error('Error in executeStatusChangeAutomations:', error);
    result.errors.push(String(error));
    return result;
  }
};

/**
 * Execute a specific automation action
 */
const executeAction = async (
  actionType: string,
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  switch (actionType) {
    case 'create_subtask':
      await executeCreateSubtask(info, config, automationName);
      break;

    case 'set_priority':
      await executeSetPriority(info, config, automationName);
      break;

    case 'add_assignee':
    case 'auto_assign_user':
      await executeAddAssignee(info, config, automationName);
      break;

    case 'archive_task':
      await executeArchiveTask(info, automationName);
      break;

    case 'set_due_date':
      await executeSetDueDate(info, config, automationName);
      break;

    case 'set_status':
      await executeSetStatus(info, config, automationName);
      break;

    case 'add_tag':
      await executeAddTag(info, config, automationName);
      break;

    case 'remove_tag':
      await executeRemoveTag(info, config, automationName);
      break;

    case 'move_task':
      await executeMoveTask(info, config, automationName);
      break;

    case 'set_start_date':
      await executeSetStartDate(info, config, automationName);
      break;

    case 'remove_assignee':
      await executeRemoveAssignee(info, config, automationName);
      break;

    case 'remove_all_assignees':
      await executeRemoveAllAssignees(info, automationName);
      break;

    case 'auto_add_follower':
    case 'add_follower':
      await executeAddFollower(info, config, automationName);
      break;

    case 'send_notification':
      await executeSendNotification(info, config, automationName);
      break;

    case 'send_webhook':
      await executeSendWebhook(info, config, automationName);
      break;

    default:
      console.log(`Action type '${actionType}' not implemented for status change`);
  }
};

/**
 * Create a subtask for the parent task
 */
const executeCreateSubtask = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get the default status for the workspace
  const { data: defaultStatus } = await supabase
    .from('statuses')
    .select('id')
    .eq('workspace_id', info.workspaceId)
    .eq('is_default', true)
    .single();

  const statusId = defaultStatus?.id;
  
  if (!statusId) {
    // Fallback: get first status
    const { data: firstStatus } = await supabase
      .from('statuses')
      .select('id')
      .eq('workspace_id', info.workspaceId)
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    if (!firstStatus) throw new Error('No status found for subtask');
    
    await createSubtaskWithActivity(info, config, user.id, firstStatus.id, automationName);
  } else {
    await createSubtaskWithActivity(info, config, user.id, statusId, automationName);
  }
};

const createSubtaskWithActivity = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  userId: string,
  statusId: string,
  automationName: string
): Promise<void> => {
  const subtaskTitle = config?.title || config?.subtask_title || 'Subtarefa automática';
  const subtaskDescription = config?.description || null;

  const { data: subtask, error } = await supabase.from('tasks').insert({
    workspace_id: info.workspaceId,
    list_id: info.listId,
    parent_id: info.taskId,
    status_id: statusId,
    title: subtaskTitle,
    description: subtaskDescription,
    priority: 'medium',
    created_by_user_id: userId,
  }).select('id').single();

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, userId, 'subtask.created', {
    metadata: {
      subtask_id: subtask?.id,
      subtask_title: subtaskTitle,
      automation_name: automationName,
    },
  });
  
  console.log(`Subtask "${subtaskTitle}" created for task ${info.taskId}`);
};

/**
 * Set priority of the task
 */
const executeSetPriority = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Buscar prioridade atual
  const { data: task } = await supabase
    .from('tasks')
    .select('priority')
    .eq('id', info.taskId)
    .single();

  const oldPriority = task?.priority || 'medium';
  const newPriority = config?.priority || 'medium';
  
  const { error } = await supabase
    .from('tasks')
    .update({ priority: newPriority })
    .eq('id', info.taskId);

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, user.id, 'priority.changed', {
    oldValue: oldPriority,
    newValue: newPriority,
    metadata: { automation_name: automationName },
  });
  
  console.log(`Priority set to "${newPriority}" for task ${info.taskId}`);
};

/**
 * Add assignees to the task (supports multiple users)
 */
const executeAddAssignee = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  // Support both user_ids (array) and legacy user_id (string)
  const userIds = config?.user_ids || (config?.user_id ? [config.user_id] : []);
  if (!userIds.length) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const userId of userIds) {
    const { error } = await supabase
      .from('task_assignees')
      .upsert(
        { task_id: info.taskId, user_id: userId },
        { onConflict: 'task_id,user_id' }
      );

    if (error) {
      console.error('Error adding assignee:', error);
      continue;
    }
    
    // Buscar nome do usuário adicionado
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Registrar atividade
    await logAutomationActivity(info.taskId, user.id, 'assignee.added', {
      newValue: profile?.full_name || userId,
      metadata: { 
        assignee_id: userId,
        automation_name: automationName,
      },
    });
  }
  
  console.log(`${userIds.length} assignee(s) added to task ${info.taskId}`);
};

/**
 * Archive the task
 */
const executeArchiveTask = async (
  info: StatusChangeInfo,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', info.taskId);

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, user.id, 'task.archived', {
    metadata: { automation_name: automationName },
  });
  
  console.log(`Task ${info.taskId} archived`);
};

/**
 * Set due date for the task
 */
const executeSetDueDate = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Buscar data atual
  const { data: task } = await supabase
    .from('tasks')
    .select('due_date, created_at')
    .eq('id', info.taskId)
    .single();

  const oldDueDate = task?.due_date;
  
  let dueDate: string | null = null;

  if (config?.date_type === 'days_after_trigger') {
    const days = parseInt(config.days_count) || 0;
    const date = new Date();
    date.setDate(date.getDate() + days);
    dueDate = date.toISOString().split('T')[0];
  } else if (config?.date_type === 'first_day_of_month') {
    const now = new Date();
    dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
  } else if (config?.date_type === 'last_day_of_month') {
    const now = new Date();
    dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  } else if (config?.date_type === 'specific_day') {
    // Referência: mês em que a tarefa foi criada (fallback: hoje)
    const day = parseInt(config.day_of_month) || 1;
    const createdRaw = task?.created_at ? new Date(task.created_at) : new Date();
    const creation = new Date(
      createdRaw.getFullYear(),
      createdRaw.getMonth(),
      createdRaw.getDate()
    );

    // Clamp para o último dia do mês de criação, se necessário
    const lastDayOfMonth = new Date(
      creation.getFullYear(),
      creation.getMonth() + 1,
      0
    ).getDate();
    let target = new Date(
      creation.getFullYear(),
      creation.getMonth(),
      Math.min(day, lastDayOfMonth)
    );

    // Se a data cair antes da criação, usar criação + 1 dia
    if (target.getTime() < creation.getTime()) {
      target = new Date(
        creation.getFullYear(),
        creation.getMonth(),
        creation.getDate() + 1
      );
    }

    dueDate = formatLocalDate(target);
  } else if (config?.days_from_now) {
    // Legacy compatibility
    const date = new Date();
    date.setDate(date.getDate() + parseInt(config.days_from_now));
    dueDate = date.toISOString().split('T')[0];
  } else if (config?.due_date) {
    dueDate = config.due_date;
  }

  if (!dueDate) return;

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: dueDate })
    .eq('id', info.taskId);

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, user.id, 'due_date.changed', {
    oldValue: oldDueDate || null,
    newValue: dueDate,
    metadata: { automation_name: automationName },
  });
  
  console.log(`Due date set to ${dueDate} for task ${info.taskId}`);
};

/**
 * Set status of the task
 */
const executeSetStatus = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const statusId = config?.status_id;
  if (!statusId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({ status_id: statusId })
    .eq('id', info.taskId);

  if (error) throw error;
  
  console.log(`Status changed to ${statusId} for task ${info.taskId} via automation`);
};

/**
 * Add a tag to the task
 */
const executeAddTag = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  // Support both tag_id (from UI) and legacy tag_name
  const tagId = config?.tag_id;
  const tagName = config?.tag_name;

  if (!tagId && !tagName) return;

  let resolvedTagId = tagId;

  // If only tag_name provided (legacy), resolve to tag_id
  if (!resolvedTagId && tagName) {
    const { data: tag } = await supabase
      .from('task_tags')
      .select('id')
      .eq('workspace_id', info.workspaceId)
      .eq('name', tagName)
      .single();

    if (!tag) {
      const { data: newTag, error: createError } = await supabase
        .from('task_tags')
        .insert({ workspace_id: info.workspaceId, name: tagName })
        .select('id')
        .single();
      if (createError) throw createError;
      resolvedTagId = newTag?.id;
    } else {
      resolvedTagId = tag.id;
    }
  }

  if (!resolvedTagId) return;

  await supabase
    .from('task_tag_relations')
    .upsert(
      { task_id: info.taskId, tag_id: resolvedTagId },
      { onConflict: 'task_id,tag_id' }
    );

  console.log(`Tag added to task ${info.taskId} (tag_id: ${resolvedTagId})`);
};

/**
 * Remove a tag from the task
 */
const executeRemoveTag = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  // Support both tag_id (from UI) and legacy tag_name
  const tagId = config?.tag_id;
  const tagName = config?.tag_name;

  if (!tagId && !tagName) return;

  let resolvedTagId = tagId;

  // If only tag_name provided (legacy), resolve to tag_id
  if (!resolvedTagId && tagName) {
    const { data: tag } = await supabase
      .from('task_tags')
      .select('id')
      .eq('workspace_id', info.workspaceId)
      .eq('name', tagName)
      .single();
    if (!tag) return;
    resolvedTagId = tag.id;
  }

  if (!resolvedTagId) return;

  await supabase
    .from('task_tag_relations')
    .delete()
    .eq('task_id', info.taskId)
    .eq('tag_id', resolvedTagId);

  console.log(`Tag removed from task ${info.taskId} (tag_id: ${resolvedTagId})`);
};

/**
 * Move task to another list
 */
const executeMoveTask = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const targetListId = config?.target_list_id;
  if (!targetListId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: oldList } = await supabase
    .from('lists')
    .select('name')
    .eq('id', info.listId)
    .single();

  const { error } = await supabase
    .from('tasks')
    .update({ list_id: targetListId })
    .eq('id', info.taskId);

  if (error) throw error;

  // Update info.listId so subsequent actions use the new list context
  info.listId = targetListId;

  const { data: newList } = await supabase
    .from('lists')
    .select('name')
    .eq('id', targetListId)
    .single();

  await logAutomationActivity(info.taskId, user.id, 'task.moved', {
    oldValue: oldList?.name || info.listId,
    newValue: newList?.name || targetListId,
    metadata: { automation_name: automationName, target_list_id: targetListId },
  });

  console.log(`Task ${info.taskId} moved to list ${targetListId}`);

  // NOTE: applyAutomationsToTask is called AFTER all actions complete (not here)
  // to avoid subsequent actions (like remove_all_assignees) wiping out the newly added assignees
};

/**
 * Set start date for the task
 */
const executeSetStartDate = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: task } = await supabase
    .from('tasks')
    .select('start_date')
    .eq('id', info.taskId)
    .single();

  const oldStartDate = task?.start_date;

  let startDate: string | null = null;

  if (config?.date_type === 'days_after_trigger') {
    const days = parseInt(config.days_count) || 0;
    const date = new Date();
    date.setDate(date.getDate() + days);
    startDate = date.toISOString().split('T')[0];
  } else if (config?.date_type === 'first_day_of_month') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
  } else if (config?.date_type === 'last_day_of_month') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  } else if (config?.date_type === 'specific_day') {
    const day = parseInt(config.day_of_month) || 1;
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), day).toISOString().split('T')[0];
  } else if (config?.days_from_now) {
    // Legacy compatibility
    const date = new Date();
    date.setDate(date.getDate() + parseInt(config.days_from_now));
    startDate = date.toISOString().split('T')[0];
  } else if (config?.start_date) {
    startDate = config.start_date;
  }

  if (!startDate) return;

  const { error } = await supabase
    .from('tasks')
    .update({ start_date: startDate })
    .eq('id', info.taskId);

  if (error) throw error;

  await logAutomationActivity(info.taskId, user.id, 'start_date.changed', {
    oldValue: oldStartDate || null,
    newValue: startDate,
    metadata: { automation_name: automationName },
  });

  console.log(`Start date set to ${startDate} for task ${info.taskId}`);
};

/**
 * Remove specific assignees from the task
 */
const executeRemoveAssignee = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const userIds = config?.user_ids || (config?.user_id ? [config.user_id] : []);
  if (!userIds.length) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const userId of userIds) {
    const { error } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', info.taskId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing assignee:', error);
      continue;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    await logAutomationActivity(info.taskId, user.id, 'assignee.removed', {
      oldValue: profile?.full_name || userId,
      metadata: { assignee_id: userId, automation_name: automationName },
    });
  }

  console.log(`${userIds.length} assignee(s) removed from task ${info.taskId}`);
};

/**
 * Remove all assignees from the task
 */
const executeRemoveAllAssignees = async (
  info: StatusChangeInfo,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', info.taskId);

  if (error) throw error;

  await logAutomationActivity(info.taskId, user.id, 'assignees.cleared', {
    metadata: { automation_name: automationName },
  });

  console.log(`All assignees removed from task ${info.taskId}`);
};

/**
 * Add followers to the task
 */
const executeAddFollower = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const userIds = config?.user_ids || (config?.user_id ? [config.user_id] : []);
  if (!userIds.length) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const userId of userIds) {
    const { error } = await supabase
      .from('task_followers')
      .upsert(
        { task_id: info.taskId, user_id: userId, source_type: 'automation' },
        { onConflict: 'task_id,user_id' }
      );

    if (error) {
      console.error('Error adding follower:', error);
      continue;
    }
  }

  console.log(`${userIds.length} follower(s) added to task ${info.taskId}`);
};

/**
 * Send a notification
 */
const executeSendNotification = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const message = config?.message || `Automação "${automationName}" disparada`;
  
  let userIds: string[] = [];
  const targetType = config?.target_type;

  if (targetType === 'task_creator') {
    const { data: task } = await supabase
      .from('tasks')
      .select('created_by_user_id')
      .eq('id', info.taskId)
      .single();
    if (task?.created_by_user_id) userIds = [task.created_by_user_id];
  } else if (targetType === 'task_assignees') {
    const { data: assignees } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', info.taskId);
    userIds = assignees?.map(a => a.user_id) || [];
  } else if (targetType === 'task_followers') {
    const { data: followers } = await supabase
      .from('task_followers')
      .select('user_id')
      .eq('task_id', info.taskId);
    userIds = followers?.map(f => f.user_id) || [];
  } else {
    // specific_users or legacy fallback
    userIds = config?.user_ids || (config?.user_id ? [config.user_id] : []);
  }

  if (!userIds.length) return;

  for (const userId of userIds) {
    await supabase.from('notifications').insert({
      user_id: userId,
      workspace_id: info.workspaceId,
      title: automationName,
      message,
      type: 'automation',
      reference_id: info.taskId,
      reference_type: 'task',
    });
  }

  console.log(`Notification sent to ${userIds.length} user(s) for task ${info.taskId}`);
};

/**
 * Send a webhook
 */
const executeSendWebhook = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const url = config?.webhook_url || config?.url;
  if (!url) return;

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', info.taskId)
    .single();

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'automation.triggered',
        automation_name: automationName,
        task,
        old_status_id: info.oldStatusId,
        new_status_id: info.newStatusId,
        timestamp: new Date().toISOString(),
      }),
    });
    console.log(`Webhook sent to ${url} for task ${info.taskId}`);
  } catch (err) {
    console.error('Error sending webhook:', err);
  }
};

/**
 * Execute automations triggered by tag additions or removals
 */
export const executeTagAutomations = async (
  taskId: string,
  workspaceId: string,
  tagId: string,
  event: 'on_tag_added' | 'on_tag_removed',
  queryClient?: QueryClient
): Promise<void> => {
  try {
    // 1. Fetch task info
    const { data: task } = await supabase
      .from('tasks')
      .select('id, status_id, list_id, workspace_id')
      .eq('id', taskId)
      .single();

    if (!task) return;

    // 2. Get list hierarchy for scope filtering
    const { data: list } = await supabase
      .from('lists')
      .select('id, space_id, folder_id')
      .eq('id', task.list_id)
      .single();

    if (!list) return;

    // 3. Build scope IDs
    const scopeIds: string[] = [workspaceId];
    if (list.space_id) scopeIds.push(list.space_id);
    if (list.folder_id) scopeIds.push(list.folder_id);
    scopeIds.push(task.list_id);

    // 4. Fetch all enabled automations for the workspace
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('enabled', true)
      .eq('workspace_id', workspaceId);

    if (error || !automations) return;

    // 5. Filter to automations whose trigger or or_triggers include the event
    const tagAutomations = automations.filter(a => {
      const config = a.action_config as Record<string, any> | null;
      const orTriggers = (config?.or_triggers as string[] | undefined) || [];
      return a.trigger === event || orTriggers.includes(event);
    });

    // 6. Filter by scope
    const applicableAutomations = tagAutomations.filter((automation) => {
      if (!automation.scope_id && automation.scope_type === 'workspace') return true;
      return automation.scope_id && scopeIds.includes(automation.scope_id);
    });

    if (applicableAutomations.length === 0) return;

    console.log(`Found ${applicableAutomations.length} applicable automations for ${event}`);

    // 7. Fetch task data once for condition evaluation
    let taskData: TaskData | null = null;

    for (const automation of applicableAutomations) {
      try {
        const actionConfig = automation.action_config as Record<string, any> | null;

        // Check trigger_config.tag_ids filter
        const triggerConfig = actionConfig?.trigger_config;
        const conditions = actionConfig?.conditions as AutomationCondition[] | undefined;
        const hasTagConditions = conditions?.some(c => c.field === 'tag');

        // Se tem condições de tag, delegar a filtragem às condições (suporta OR)
        // Se não tem condições de tag, usar tag_ids do trigger como filtro
        if (!hasTagConditions && triggerConfig?.tag_ids && Array.isArray(triggerConfig.tag_ids) && triggerConfig.tag_ids.length > 0) {
          if (!triggerConfig.tag_ids.includes(tagId)) {
            continue; // This automation is for different tags
          }
        }

        // Evaluate conditions
        if (conditions && conditions.length > 0) {
          if (!taskData) {
            taskData = await fetchTaskData(taskId);
          }
          if (!taskData) continue;

          const conditionsMet = evaluateConditions(conditions, taskData);
          if (!conditionsMet) continue;
        }

        // Check for duplicate execution within 5-second window (prevents double-fire, allows re-trigger)
        const { data: existingExecution } = await supabase
          .from('automation_executions')
          .select('id')
          .eq('automation_id', automation.id)
          .eq('task_id', taskId)
          .eq('status_id', tagId)
          .gte('executed_at', new Date(Date.now() - 5000).toISOString())
          .maybeSingle();

        if (existingExecution) {
          console.log(`Tag automation ${automation.id} recently executed for task ${taskId} with tag ${tagId}`);
          continue;
        }

        // Record execution
        await supabase.from('automation_executions').insert({
          automation_id: automation.id,
          task_id: taskId,
          status_id: tagId, // reusing status_id column as dedup key for the tag
        });

        const automationName = automation.description || `Automação ${automation.id.slice(0, 8)}`;

        const info: StatusChangeInfo = {
          taskId,
          workspaceId,
          listId: task.list_id,
          oldStatusId: task.status_id,
          newStatusId: task.status_id,
        };

        // Execute actions (multi or single)
        const actionsArray = actionConfig?.actions as Array<{ type: string; config: Record<string, any> }> | undefined;
        const originalListId = info.listId;

        if (actionsArray && actionsArray.length > 0) {
          for (const action of actionsArray) {
            await executeAction(action.type, info, action.config, automationName);
          }
        } else {
          await executeAction(automation.action_type, info, actionConfig, automationName);
        }

        // Apply destination list automations AFTER all actions complete
        if (info.listId !== originalListId) {
          try {
            await applyAutomationsToTask({
              id: info.taskId,
              workspace_id: info.workspaceId,
              list_id: info.listId,
            });
          } catch (applyError) {
            console.error('Error applying destination list automations:', applyError);
          }
        }

        console.log(`Tag automation ${automation.id} executed for task ${taskId} (${event})`);
      } catch (err) {
        console.error(`Error executing tag automation ${automation.id}:`, err);
      }
    }

    if (queryClient) {
      invalidateAutomationQueries(queryClient, taskId);
    }
  } catch (error) {
    console.error('Error in executeTagAutomations:', error);
  }
};

/**
 * Re-evaluate automations when a condition-relevant field changes (e.g. tag added/removed).
 * This allows automations to fire regardless of the order of operations.
 */
export const reevaluateConditionAutomations = async (
  taskId: string,
  workspaceId: string,
  queryClient?: QueryClient
): Promise<void> => {
  try {
    // 1. Fetch current task data
    const { data: task } = await supabase
      .from('tasks')
      .select('id, status_id, list_id, workspace_id')
      .eq('id', taskId)
      .single();

    if (!task) return;

    // 2. Get list hierarchy for scope filtering
    const { data: list } = await supabase
      .from('lists')
      .select('id, space_id, folder_id')
      .eq('id', task.list_id)
      .single();

    if (!list) return;

    // 3. Build scope IDs
    const scopeIds: string[] = [workspaceId];
    if (list.space_id) scopeIds.push(list.space_id);
    if (list.folder_id) scopeIds.push(list.folder_id);
    scopeIds.push(task.list_id);

    // 4. Fetch all enabled automations and filter client-side (including or_triggers)
    const { data: allAutomations } = await supabase
      .from('automations')
      .select('*')
      .eq('enabled', true)
      .eq('workspace_id', workspaceId);

    if (!allAutomations || allAutomations.length === 0) return;

    // Filter to automations that include 'on_status_changed' as primary or or_trigger
    const automations = allAutomations.filter(a => {
      const config = a.action_config as Record<string, any> | null;
      const orTriggers = (config?.or_triggers as string[] | undefined) || [];
      return a.trigger === 'on_status_changed' || orTriggers.includes('on_status_changed');
    });

    if (automations.length === 0) return;

    // 5. Filter by scope
    const applicableAutomations = automations.filter((automation) => {
      if (!automation.scope_id && automation.scope_type === 'workspace') return true;
      return automation.scope_id && scopeIds.includes(automation.scope_id);
    });

    // 6. Fetch fresh task data for condition evaluation
    const taskData = await fetchTaskData(taskId);
    if (!taskData) return;

    for (const automation of applicableAutomations) {
      try {
        const actionConfig = automation.action_config as Record<string, any> | null;
        const conditions = actionConfig?.conditions as AutomationCondition[] | undefined;

        // Only re-evaluate automations that HAVE conditions
        if (!conditions || conditions.length === 0) continue;

        // Check if current status satisfies the trigger's to_status_ids
        const triggerConfig = actionConfig?.trigger_config;
        if (triggerConfig) {
          const toStatusIds: string[] = triggerConfig.to_status_ids ||
            (triggerConfig.to_status_id ? [triggerConfig.to_status_id] : []);

          // If to_status_ids is specified, current status must match
          if (toStatusIds.length > 0 && !toStatusIds.includes(task.status_id)) {
            continue;
          }
        }

        // Evaluate conditions with fresh data
        const conditionsMet = evaluateConditions(conditions, taskData);
        if (!conditionsMet) continue;

        // Check for duplicate execution within 5-second window (prevents double-fire, allows re-trigger)
        const { data: existingExecution } = await supabase
          .from('automation_executions')
          .select('id')
          .eq('automation_id', automation.id)
          .eq('task_id', taskId)
          .eq('status_id', task.status_id)
          .gte('executed_at', new Date(Date.now() - 5000).toISOString())
          .maybeSingle();

        if (existingExecution) {
          console.log(`Automation ${automation.id} recently executed for task ${taskId} at status ${task.status_id}`);
          continue;
        }

        // Record execution to prevent duplicates
        await supabase.from('automation_executions').insert({
          automation_id: automation.id,
          task_id: taskId,
          status_id: task.status_id,
        });

        const automationName = automation.description || `Automação ${automation.id.slice(0, 8)}`;

        // Build a StatusChangeInfo for action execution
        const info: StatusChangeInfo = {
          taskId,
          workspaceId,
          listId: task.list_id,
          oldStatusId: task.status_id, // same as current since status didn't change now
          newStatusId: task.status_id,
        };

        // Execute actions
        const actionsArray = actionConfig?.actions as Array<{ type: string; config: Record<string, any> }> | undefined;
        const originalListId = info.listId;

        if (actionsArray && actionsArray.length > 0) {
          for (const action of actionsArray) {
            await executeAction(action.type, info, action.config, automationName);
          }
        } else {
          await executeAction(automation.action_type, info, actionConfig, automationName);
        }

        // Apply destination list automations AFTER all actions complete
        if (info.listId !== originalListId) {
          try {
            await applyAutomationsToTask({
              id: info.taskId,
              workspace_id: info.workspaceId,
              list_id: info.listId,
            });
          } catch (applyError) {
            console.error('Error applying destination list automations:', applyError);
          }
        }

        console.log(`Automation ${automation.id} executed via re-evaluation for task ${taskId}`);

        // Invalidate queries immediately
        if (queryClient) {
          invalidateAutomationQueries(queryClient, taskId);
        }
      } catch (err) {
        console.error(`Error re-evaluating automation ${automation.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in reevaluateConditionAutomations:', error);
  }
};

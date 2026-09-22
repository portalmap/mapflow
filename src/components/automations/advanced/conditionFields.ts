/**
 * Catálogo de campos de condição das automações.
 *
 * Espelha exatamente a lista de gatilhos (triggerCategories.ts): para cada
 * gatilho existe um campo de condição com o mesmo rótulo e categoria.
 * Os campos legados (tag, priority, assignee, due_date, has_subtasks)
 * continuam válidos para automações já salvas.
 */

export type ConditionValueType =
  | 'status'
  | 'tag'
  | 'user'
  | 'priority'
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'event';

export interface ConditionFieldDef {
  value: string;
  label: string;
  valueType: ConditionValueType;
}

export interface ConditionFieldGroup {
  name: string;
  fields: ConditionFieldDef[];
}

export const OPERATOR_LABELS: Record<string, string> = {
  equals: 'É igual a',
  not_equals: 'É diferente de',
  contains: 'Contém',
  not_contains: 'Não contém',
  any_of: 'É uma das opções',
  none_of: 'Não é nenhuma das opções',
  is_set: 'Está definido',
  is_not_set: 'Não está definido',
  before: 'É antes de',
  after: 'É depois de',
  greater_than: 'É maior que',
  less_than: 'É menor que',
};

/** Operadores disponíveis por tipo de valor. */
export const OPERATORS_BY_TYPE: Record<ConditionValueType, { value: string; label: string }[]> = {
  status: [
    { value: 'any_of', label: 'É uma das etapas' },
    { value: 'none_of', label: 'Não é nenhuma das etapas' },
  ],
  tag: [
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'any_of', label: 'Inclui uma das opções' },
    { value: 'none_of', label: 'Não inclui nenhuma' },
  ],
  user: [
    { value: 'is_set', label: 'Está atribuído' },
    { value: 'is_not_set', label: 'Não está atribuído' },
    { value: 'contains', label: 'Inclui usuário' },
    { value: 'not_contains', label: 'Não inclui usuário' },
  ],
  priority: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'É diferente de' },
    { value: 'any_of', label: 'É uma das opções' },
  ],
  text: [
    { value: 'contains', label: 'Contém o texto' },
    { value: 'not_contains', label: 'Não contém o texto' },
    { value: 'equals', label: 'É exatamente' },
    { value: 'not_equals', label: 'É diferente de' },
    { value: 'is_set', label: 'Está preenchido' },
    { value: 'is_not_set', label: 'Está vazio' },
  ],
  number: [
    { value: 'greater_than', label: 'É maior que' },
    { value: 'less_than', label: 'É menor que' },
    { value: 'equals', label: 'É igual a' },
  ],
  date: [
    { value: 'is_set', label: 'Está definida' },
    { value: 'is_not_set', label: 'Não está definida' },
    { value: 'before', label: 'É antes de' },
    { value: 'after', label: 'É depois de' },
  ],
  boolean: [
    { value: 'is_set', label: 'Sim' },
    { value: 'is_not_set', label: 'Não' },
  ],
  event: [
    { value: 'is_set', label: 'Aconteceu nesta alteração' },
    { value: 'is_not_set', label: 'Não aconteceu nesta alteração' },
  ],
};

export const CONDITION_FIELD_GROUPS: ConditionFieldGroup[] = [
  {
    name: 'Campos da tarefa',
    fields: [
      { value: 'tag', label: 'Etiqueta', valueType: 'tag' },
      { value: 'priority', label: 'Prioridade', valueType: 'priority' },
      { value: 'assignee', label: 'Responsável', valueType: 'user' },
      { value: 'due_date', label: 'Data de vencimento', valueType: 'date' },
      { value: 'has_subtasks', label: 'Subtarefas', valueType: 'boolean' },
    ],
  },
  {
    name: 'AI',
    fields: [
      { value: 'on_task_updated', label: 'Tarefa ou subtarefa atualizada', valueType: 'event' },
    ],
  },
  {
    name: 'Adicionar ou mover',
    fields: [
      { value: 'on_task_created', label: 'Tarefa ou subtarefa criada', valueType: 'event' },
      { value: 'on_task_added_here', label: 'Tarefa existente adicionada aqui', valueType: 'event' },
      { value: 'on_task_moved_here', label: 'Tarefa existente movida para cá', valueType: 'event' },
    ],
  },
  {
    name: 'Comunicação',
    fields: [
      { value: 'on_comment_added', label: 'Possui comentário', valueType: 'boolean' },
    ],
  },
  {
    name: 'Criar e concluir',
    fields: [
      { value: 'on_all_checklists_resolved', label: 'Todas as checklists resolvidas', valueType: 'boolean' },
      { value: 'on_all_subtasks_resolved', label: 'Todas as subtarefas resolvidas', valueType: 'boolean' },
    ],
  },
  {
    name: 'Datas e horário',
    fields: [
      { value: 'on_due_date_changed', label: 'Data final', valueType: 'date' },
      { value: 'on_due_date_arrives', label: 'Chegada da data final', valueType: 'date' },
      { value: 'on_start_date_changed', label: 'Data de início', valueType: 'date' },
      { value: 'on_start_date_arrives', label: 'Chegada da data de início', valueType: 'date' },
      { value: 'on_date_before_after', label: 'A data é antes/depois de', valueType: 'date' },
      { value: 'on_custom_date_arrives', label: 'Data do campo personalizado', valueType: 'date' },
      { value: 'on_time_tracked', label: 'Tempo rastreado (minutos)', valueType: 'number' },
      { value: 'on_schedule', label: 'Execução agendada', valueType: 'event' },
    ],
  },
  {
    name: 'Gerenciamento de tarefas',
    fields: [
      { value: 'on_status_changed', label: 'Status', valueType: 'status' },
      { value: 'on_custom_field_changed', label: 'Campo personalizado alterado', valueType: 'event' },
      { value: 'on_assignee_added', label: 'Responsável adicionado', valueType: 'user' },
      { value: 'on_assignee_removed', label: 'Responsável removido', valueType: 'user' },
      { value: 'on_name_changed', label: 'Nome da tarefa', valueType: 'text' },
      { value: 'on_priority_changed', label: 'Prioridade alterada', valueType: 'priority' },
      { value: 'on_tag_added', label: 'Etiqueta adicionada', valueType: 'tag' },
      { value: 'on_tag_removed', label: 'Etiqueta removida', valueType: 'tag' },
      { value: 'on_task_type_changed', label: 'Tipo/formato da tarefa', valueType: 'text' },
      { value: 'on_task_linked', label: 'Tarefa vinculada', valueType: 'event' },
      { value: 'on_task_unblocked', label: 'Tarefa desbloqueada', valueType: 'event' },
    ],
  },
];

export const ALL_CONDITION_FIELDS: ConditionFieldDef[] = CONDITION_FIELD_GROUPS.flatMap(g => g.fields);

export const getConditionField = (value: string): ConditionFieldDef | undefined =>
  ALL_CONDITION_FIELDS.find(f => f.value === value);

export const getOperatorsForField = (field: string) => {
  const def = getConditionField(field);
  return def ? OPERATORS_BY_TYPE[def.valueType] : OPERATORS_BY_TYPE.boolean;
};

export const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

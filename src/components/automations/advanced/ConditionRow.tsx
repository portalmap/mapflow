import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStatuses } from '@/hooks/useStatuses';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CONDITION_FIELD_GROUPS,
  PRIORITY_OPTIONS,
  getConditionField,
  getOperatorsForField,
} from './conditionFields';

export interface AutomationCondition {
  id: string;
  /** Campo da tarefa ou gatilho espelhado (ver conditionFields.ts) */
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'is_set'
    | 'is_not_set'
    | 'any_of'
    | 'none_of'
    | 'before'
    | 'after'
    | 'greater_than'
    | 'less_than';
  value: string | string[];
  logic: 'AND' | 'OR';
}

interface ConditionRowProps {
  condition: AutomationCondition;
  workspaceId: string;
  onUpdate: (updates: Partial<AutomationCondition>) => void;
  onDelete: () => void;
}

export const ConditionRow = ({
  condition,
  workspaceId,
  onUpdate,
  onDelete,
}: ConditionRowProps) => {
  const fieldDef = getConditionField(condition.field);
  const valueType = fieldDef?.valueType ?? 'boolean';

  // Fetch workspace members for assignee conditions
  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members-with-profiles', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: workspaceMembers, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      const userIds = workspaceMembers.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return workspaceMembers.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id) || null,
      }));
    },
    enabled: !!workspaceId && valueType === 'user',
  });

  // Fetch tags for tag conditions
  const { data: tags = [] } = useQuery({
    queryKey: ['workspace-tags', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('task_tags')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && valueType === 'tag',
  });

  const { data: statuses = [] } = useStatuses(valueType === 'status' ? workspaceId : undefined);

  const handleFieldChange = (field: string) => {
    // Reset operator and value when field changes
    const defaultOperator = getOperatorsForField(field)?.[0]?.value || 'equals';
    onUpdate({
      field,
      operator: defaultOperator as AutomationCondition['operator'],
      value: [],
    });
  };

  const handleOperatorChange = (operator: string) => {
    onUpdate({ operator: operator as AutomationCondition['operator'] });
  };

  const handleValueChange = (value: string | string[]) => {
    onUpdate({ value });
  };

  const operators = getOperatorsForField(condition.field) || [];
  const needsValue =
    !['is_set', 'is_not_set'].includes(condition.operator) &&
    valueType !== 'boolean' &&
    valueType !== 'event';

  const renderValueInput = () => {
    if (!needsValue) return null;

    const currentValues = Array.isArray(condition.value)
      ? condition.value
      : [condition.value].filter(Boolean);

    switch (valueType) {
      case 'priority':
        return (
          <div className="flex flex-wrap gap-1">
            {PRIORITY_OPTIONS.map(opt => (
              <Badge
                key={opt.value}
                variant={currentValues.includes(opt.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  if (currentValues.includes(opt.value)) {
                    handleValueChange(currentValues.filter(v => v !== opt.value));
                  } else {
                    handleValueChange([...currentValues, opt.value]);
                  }
                }}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
        );

      case 'user':
        return (
          <Select
            value={currentValues[0] || ''}
            onValueChange={(v) => handleValueChange([v])}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione usuário..." />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profile?.full_name || 'Usuário'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'status':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {currentValues.map(statusId => {
                const status = statuses.find(s => s.id === statusId);
                return (
                  <Badge
                    key={statusId}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleValueChange(currentValues.filter(v => v !== statusId))}
                  >
                    {status?.name || 'Etapa'} ×
                  </Badge>
                );
              })}
            </div>
            <Select
              value=""
              onValueChange={(v) => {
                if (v && !currentValues.includes(v)) {
                  handleValueChange([...currentValues, v]);
                }
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Adicionar etapa..." />
              </SelectTrigger>
              <SelectContent>
                {statuses
                  .filter(status => !currentValues.includes(status.id))
                  .map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color || '#94a3b8' }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'tag':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {currentValues.map(tagName => (
                <Badge
                  key={tagName}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleValueChange(currentValues.filter(v => v !== tagName))}
                >
                  {tagName} ×
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(v) => {
                if (v && !currentValues.includes(v)) {
                  handleValueChange([...currentValues, v]);
                }
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Adicionar etiqueta..." />
              </SelectTrigger>
              <SelectContent>
                {tags
                  .filter(tag => !currentValues.includes(tag.name))
                  .map(tag => (
                    <SelectItem key={tag.id} value={tag.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || '#94a3b8' }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={typeof condition.value === 'string' ? condition.value : currentValues[0] || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="h-8"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={typeof condition.value === 'string' ? condition.value : currentValues[0] || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="0"
            className="h-8"
          />
        );

      default:
        return (
          <Input
            value={typeof condition.value === 'string' ? condition.value : currentValues[0] || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Valor..."
            className="h-8"
          />
        );
    }
  };

  return (
    <div className="flex items-start gap-1.5 p-2 bg-muted/30 rounded-md border">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {/* Field selector */}
          <Select value={condition.field} onValueChange={handleFieldChange}>
            <SelectTrigger className="h-7 w-[190px] text-xs">
              <SelectValue placeholder="Selecione o campo" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {CONDITION_FIELD_GROUPS.map(group => (
                <SelectGroup key={group.name}>
                  <SelectLabel className="text-[10px] uppercase text-muted-foreground">
                    {group.name}
                  </SelectLabel>
                  {group.fields.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {/* Operator selector */}
          <Select value={condition.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="h-7 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value input */}
        {needsValue && <div className="pl-0">{renderValueInput()}</div>}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

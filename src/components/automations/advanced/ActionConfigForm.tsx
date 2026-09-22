// @ts-nocheck
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getActionById, ActionConfigField } from './actionCategories';
import { List, Folder } from 'lucide-react';
import { useStatusesForScope } from '@/hooks/useStatuses';
import { UserMultiSelect } from './UserMultiSelect';

/**
 * Valida a configuração de data (campo tipo `date_config`).
 * Retorna a primeira mensagem de erro encontrada, ou null se estiver válida.
 */
export const validateDateConfig = (config: Record<string, any> = {}): string | null => {
  const dateType = config?.date_type;
  if (!dateType) return 'Selecione o tipo de data';

  if (dateType === 'days_after_trigger') {
    const days = Number(config.days_count);
    if (config.days_count === undefined || config.days_count === null || config.days_count === '' || Number.isNaN(days) || days < 0) {
      return 'Informe a quantidade de dias';
    }
    return null;
  }

  if (dateType === 'specific_day') {
    const day = Number(config.day_of_month);
    if (!day || Number.isNaN(day) || day < 1 || day > 31) return 'Informe o dia do mês (1 a 31)';
    return null;
  }

  if (dateType === 'recurring') {
    if (!config.recurrence_type) return 'Selecione a frequência da recorrência';
    if (config.recurrence_type === 'weekly' || config.recurrence_type === 'biweekly') {
      if (!config.day_of_week && config.day_of_week !== 0) return 'Selecione o dia da semana';
    }
    if (config.recurrence_type === 'monthly' || config.recurrence_type === 'quarterly') {
      if (!config.monthly_mode) return 'Selecione como calcular o dia do mês';
      if (config.monthly_mode === 'specific_day') {
        const day = Number(config.day_of_month);
        if (!day || Number.isNaN(day) || day < 1 || day > 31) return 'Informe o dia do mês (1 a 31)';
      }
      if (config.monthly_mode === 'weekday_ordinal') {
        if (!config.weekday_ordinal) return 'Selecione a ordem do dia da semana';
        if (!config.weekday) return 'Selecione o dia da semana';
      }
    }
    return null;
  }

  // first_day_of_month / last_day_of_month não exigem campos extras
  return null;
};

interface TemplateList {
  id: string;
  name: string;
  folder_ref_id?: string | null;
  status_template_id?: string | null;
}

interface TemplateFolder {
  id: string;
  name: string;
}

interface ActionConfigFormProps {
  actionId: string;
  workspaceId: string;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  // Props for scope context
  scopeType?: 'workspace' | 'space' | 'folder' | 'list';
  scopeId?: string;
  // Props for template context
  isTemplateContext?: boolean;
  templateLists?: TemplateList[];
  templateFolders?: TemplateFolder[];
}

export const ActionConfigForm = ({ 
  actionId, 
  workspaceId, 
  config, 
  onConfigChange,
  scopeType = 'workspace',
  scopeId,
  isTemplateContext = false,
  templateLists = [],
  templateFolders = [],
}: ActionConfigFormProps) => {
  const action = getActionById(actionId);

  // Fetch workspace members
  const { data: members } = useQuery({
    queryKey: ['workspace-members-with-profiles', workspaceId],
    queryFn: async () => {
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
        profile: profiles?.find(p => p.id === member.user_id) || null
      }));
    },
    enabled: !!workspaceId && !isTemplateContext,
  });

  // For template context, find the selected template list to get its status_template_id
  const selectedTemplateList = isTemplateContext && scopeType === 'list' && scopeId
    ? templateLists.find(l => l.id === scopeId)
    : null;

  // Fetch statuses from status_template_items when in template context
  const { data: templateStatuses = [] } = useQuery({
    queryKey: ['template-status-items', selectedTemplateList?.status_template_id],
    queryFn: async () => {
      if (!selectedTemplateList?.status_template_id) return [];
      
      const { data, error } = await supabase
        .from('status_template_items')
        .select('*')
        .eq('template_id', selectedTemplateList.status_template_id)
        .order('order_index');

      if (error) throw error;
      return data.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        is_default: s.is_default,
        order_index: s.order_index,
        category: s.category,
      }));
    },
    enabled: !!selectedTemplateList?.status_template_id,
  });

  // Fetch statuses for scope (using the proper scope-aware hook) - only when NOT in template context
  const { data: statuses = [] } = useStatusesForScope(
    scopeType === 'workspace' ? 'workspace' : scopeType as 'list' | 'folder' | 'space',
    scopeId,
    workspaceId
  );

  // Use template statuses when available in template context, otherwise use regular statuses
  const effectiveStatuses = isTemplateContext && templateStatuses.length > 0 ? templateStatuses : statuses;

  // Fetch workspace tags
  const { data: tags = [] } = useQuery({
    queryKey: ['workspace-tags', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_tags')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Fetch spaces for the workspace
  const { data: spaces = [] } = useQuery({
    queryKey: ['spaces', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && !isTemplateContext,
  });

  // Fetch folders for the workspace
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', 'workspace', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*, spaces!inner(workspace_id)')
        .eq('spaces.workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && !isTemplateContext,
  });

  // Fetch lists for the workspace
  const { data: lists = [] } = useQuery({
    queryKey: ['lists', 'workspace', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && !isTemplateContext,
  });

  // Organize lists by Space > Folder hierarchy
  const groupedLists = useMemo(() => {
    if (isTemplateContext) {
      // For templates, group by folder
      const withFolder = templateLists.filter(l => l.folder_ref_id);
      const withoutFolder = templateLists.filter(l => !l.folder_ref_id);
      
      const folderGroups = templateFolders.map(folder => ({
        folder,
        lists: withFolder.filter(l => l.folder_ref_id === folder.id)
      })).filter(g => g.lists.length > 0);

      return {
        folderGroups,
        directLists: withoutFolder
      };
    }

    // For regular automations, organize by Space > Folder
    return spaces.map(space => {
      const spaceFolders = folders.filter((f: any) => f.space_id === space.id);
      const folderGroups = spaceFolders.map(folder => ({
        folder,
        lists: lists.filter(l => l.folder_id === folder.id)
      })).filter(g => g.lists.length > 0);

      const directLists = lists.filter(l => l.space_id === space.id && !l.folder_id);

      return {
        space,
        folderGroups,
        directLists
      };
    }).filter(g => g.folderGroups.length > 0 || g.directLists.length > 0);
  }, [spaces, folders, lists, isTemplateContext, templateLists, templateFolders]);

  if (!action || !action.configFields?.length) {
    return null;
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    onConfigChange({ ...config, [fieldName]: value });
  };

  const renderField = (field: ActionConfigField) => {
    switch (field.type) {
      case 'user':
        return (
          <div key={field.name} className="space-y-1.5">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {member.profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.profile?.full_name || 'Usuário'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'users':
        // Backward compatibility: convert legacy user_id (string) to user_ids (array)
        const legacyFieldName = field.name === 'user_ids' ? 'user_id' : undefined;
        const currentValue = config[field.name];
        const legacyValue = legacyFieldName ? config[legacyFieldName] : undefined;
        
        // Use new array field if available, otherwise convert legacy single value to array
        const selectedUserIds = currentValue || (legacyValue ? [legacyValue] : []);
        
        return (
          <UserMultiSelect
            key={field.name}
            label={field.label}
            users={members?.map(m => ({
              id: m.user_id,
              full_name: m.profile?.full_name || null,
              avatar_url: m.profile?.avatar_url || null
            })) || []}
            selectedIds={selectedUserIds}
            onSelectionChange={(ids) => handleFieldChange(field.name, ids)}
            required={field.required}
          />
        );

      case 'status':
        return (
          <div key={field.name} className="space-y-1.5">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status..." />
              </SelectTrigger>
              <SelectContent>
                {effectiveStatuses?.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: status.color || '#94a3b8' }}
                      />
                      <span>{status.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'tag':
        return (
          <div key={field.name} className="space-y-1.5">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etiqueta..." />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tag.color || '#94a3b8' }}
                      />
                      <span>{tag.name}</span>
                    </div>
                  </SelectItem>
                ))}
                {tags.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhuma etiqueta encontrada
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      case 'list':
        return (
          <div key={field.name} className="space-y-1.5">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma lista..." />
              </SelectTrigger>
              <SelectContent>
                {isTemplateContext ? (
                  // Template context: show template lists
                  <>
                    {(groupedLists as { folderGroups: any[]; directLists: TemplateList[] }).folderGroups.map((fg) => (
                      <SelectGroup key={fg.folder.id}>
                        <SelectLabel className="flex items-center gap-1.5">
                          <Folder className="h-3.5 w-3.5" />
                          {fg.folder.name}
                        </SelectLabel>
                        {fg.lists.map((list: TemplateList) => (
                          <SelectItem key={list.id} value={list.id}>
                            <div className="flex items-center gap-2 pl-2">
                              <List className="h-4 w-4 text-muted-foreground" />
                              <span>{list.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    {(groupedLists as { folderGroups: any[]; directLists: TemplateList[] }).directLists.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">Listas diretas</SelectLabel>
                        {(groupedLists as { folderGroups: any[]; directLists: TemplateList[] }).directLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            <div className="flex items-center gap-2">
                              <List className="h-4 w-4 text-muted-foreground" />
                              <span>{list.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {templateLists.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhuma lista no template
                      </div>
                    )}
                  </>
                ) : (
                  // Normal context: show workspace lists organized by Space > Folder
                  <>
                    {(groupedLists as { space: any; folderGroups: any[]; directLists: any[] }[]).map((spaceGroup) => (
                      <SelectGroup key={spaceGroup.space.id}>
                        <SelectLabel className="font-semibold flex items-center gap-1.5">
                          <div 
                            className="w-2.5 h-2.5 rounded-sm" 
                            style={{ backgroundColor: spaceGroup.space.color || '#6366f1' }}
                          />
                          {spaceGroup.space.name}
                        </SelectLabel>
                        
                        {/* Direct lists in space */}
                        {spaceGroup.directLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            <div className="flex items-center gap-2 pl-2">
                              <List className="h-4 w-4 text-muted-foreground" />
                              <span>{list.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        
                        {/* Lists in folders */}
                        {spaceGroup.folderGroups.map((fg) => (
                          <div key={fg.folder.id}>
                            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                              <Folder className="h-3 w-3" />
                              {fg.folder.name}
                            </div>
                            {fg.lists.map((list: any) => (
                              <SelectItem key={list.id} value={list.id}>
                                <div className="flex items-center gap-2 pl-4">
                                  <List className="h-4 w-4 text-muted-foreground" />
                                  <span>{list.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectGroup>
                    ))}
                    {lists.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhuma lista encontrada
                      </div>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      case 'priority':
      case 'select':
        return (
          <div key={field.name} className="space-y-1.5">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date_config':
        return (
          <div key={field.name} className="space-y-3">
            {/* Seletor do tipo de data */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de data <span className="text-destructive">*</span></Label>
              <Select
                value={config.date_type || ''}
                onValueChange={(value) => {
                  // Limpar campos relacionados ao mudar o tipo
                  const { days_count, day_of_month, recurrence_type, day_of_week, monthly_mode, ...rest } = config;
                  onConfigChange({ ...rest, date_type: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de data..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_day_of_month">Primeiro dia do mês</SelectItem>
                  <SelectItem value="last_day_of_month">Último dia do mês</SelectItem>
                  <SelectItem value="days_after_trigger">Dias após o gatilho</SelectItem>
                  <SelectItem value="specific_day">Dia específico do mês</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Campo condicional: dias após gatilho */}
            {config.date_type === 'days_after_trigger' && (
              <div className="space-y-2">
                <Label>Quantidade de dias <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  value={config.days_count ?? ''}
                  onChange={(e) => handleFieldChange('days_count', parseInt(e.target.value) || 0)}
                  placeholder="Ex: 5"
                />
              </div>
            )}
            
            {/* Campo condicional: dia específico */}
            {config.date_type === 'specific_day' && (
              <div className="space-y-2">
                <Label>Dia do mês <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={config.day_of_month ?? ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    handleFieldChange('day_of_month', Math.min(31, Math.max(1, value || 1)));
                  }}
                  placeholder="Ex: 17"
                />
              </div>
            )}

            {/* Campo condicional: recorrência */}
            {config.date_type === 'recurring' && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-md">
                {/* Seletor de frequência */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequência <span className="text-destructive">*</span></Label>
                  <Select
                    value={config.recurrence_type || ''}
                    onValueChange={(value) => {
                      const { day_of_week, monthly_mode, day_of_month, ...rest } = config;
                      onConfigChange({ ...rest, recurrence_type: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Seletor de dia da semana (para semanal/quinzenal) */}
                {(config.recurrence_type === 'weekly' || config.recurrence_type === 'biweekly') && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dia da semana <span className="text-destructive">*</span></Label>
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { value: 'monday', label: 'Seg' },
                        { value: 'tuesday', label: 'Ter' },
                        { value: 'wednesday', label: 'Qua' },
                        { value: 'thursday', label: 'Qui' },
                        { value: 'friday', label: 'Sex' },
                      ].map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                            config.day_of_week === day.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-input hover:bg-accent'
                          }`}
                          onClick={() => handleFieldChange('day_of_week', day.value)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seletor de dia do mês (para mensal) */}
                {(config.recurrence_type === 'monthly' || config.recurrence_type === 'quarterly') && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dia do período <span className="text-destructive">*</span></Label>
                    <Select
                      value={config.monthly_mode || ''}
                      onValueChange={(value) => {
                        if (value !== 'specific_day') {
                          const { day_of_month, ...rest } = config;
                          onConfigChange({ ...rest, monthly_mode: value });
                        } else {
                          handleFieldChange('monthly_mode', value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_day">Primeiro dia do período</SelectItem>
                        <SelectItem value="last_day">Último dia do período</SelectItem>
                        <SelectItem value="specific_day">Dia específico</SelectItem>
                        <SelectItem value="weekday_ordinal">Dia da semana específico</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {config.monthly_mode === 'specific_day' && (
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={config.day_of_month ?? ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          handleFieldChange('day_of_month', Math.min(31, Math.max(1, value || 1)));
                        }}
                        placeholder="Ex: 15"
                        className="mt-2"
                      />
                    )}
                    {config.monthly_mode === 'weekday_ordinal' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Select
                          value={String(config.weekday_ordinal ?? 1)}
                          onValueChange={(v) => handleFieldChange('weekday_ordinal', parseInt(v))}
                        >
                          <SelectTrigger><SelectValue placeholder="Ordem..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Primeira</SelectItem>
                            <SelectItem value="2">Segunda</SelectItem>
                            <SelectItem value="3">Terceira</SelectItem>
                            <SelectItem value="4">Quarta</SelectItem>
                            <SelectItem value="-1">Última</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={config.weekday || 'monday'}
                          onValueChange={(v) => handleFieldChange('weekday', v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Dia..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Segunda-feira</SelectItem>
                            <SelectItem value="tuesday">Terça-feira</SelectItem>
                            <SelectItem value="wednesday">Quarta-feira</SelectItem>
                            <SelectItem value="thursday">Quinta-feira</SelectItem>
                            <SelectItem value="friday">Sexta-feira</SelectItem>
                            <SelectItem value="saturday">Sábado</SelectItem>
                            <SelectItem value="sunday">Domingo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Status que dispara a recorrência */}
                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-xs">
                    Ao alterar o status: <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={config.trigger_on_status_id || ''}
                    onValueChange={(value) => handleFieldChange('trigger_on_status_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status de conclusão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveStatuses
                        .filter((s: any) => s.category === 'done')
                        .map((status: any) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: status.color || '#22c55e' }}
                              />
                              <span>{status.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      {effectiveStatuses.filter((s: any) => s.category === 'done').length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          Nenhum status de conclusão encontrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-opções de recorrência */}
                <div className="space-y-2.5 pt-2">
                  {/* Ignorar fins de semana */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="skip_weekends"
                      checked={config.skip_weekends || false}
                      onCheckedChange={(checked) => handleFieldChange('skip_weekends', !!checked)}
                    />
                    <label htmlFor="skip_weekends" className="text-xs cursor-pointer">
                      Ignorar fins de semana
                    </label>
                  </div>

                  {/* Repetir para sempre */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="repeat_forever"
                      checked={config.repeat_forever || false}
                      onCheckedChange={(checked) => handleFieldChange('repeat_forever', !!checked)}
                    />
                    <label htmlFor="repeat_forever" className="text-xs cursor-pointer">
                      Repetir para sempre
                    </label>
                  </div>

                  {/* Criar nova tarefa */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="create_new_task"
                      checked={config.on_complete_action === 'create_new_task'}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const { reset_status_id, ...rest } = config;
                          onConfigChange({ ...rest, on_complete_action: 'create_new_task' });
                        } else {
                          const { on_complete_action, ...rest } = config;
                          onConfigChange(rest);
                        }
                      }}
                    />
                    <label htmlFor="create_new_task" className="text-xs cursor-pointer">
                      Criar nova tarefa
                    </label>
                  </div>

                  {/* Atualizar status para */}
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="update_status"
                      checked={config.on_complete_action === 'update_status'}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onConfigChange({ ...config, on_complete_action: 'update_status' });
                        } else {
                          const { on_complete_action, reset_status_id, ...rest } = config;
                          onConfigChange(rest);
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1.5">
                      <label htmlFor="update_status" className="text-xs cursor-pointer">
                        Atualizar status para:
                      </label>
                      {config.on_complete_action === 'update_status' && (
                        <Select
                          value={config.reset_status_id || ''}
                          onValueChange={(value) => handleFieldChange('reset_status_id', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {effectiveStatuses
                              .filter((s: any) => s.category !== 'done')
                              .map((status: any) => (
                                <SelectItem key={status.id} value={status.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: status.color || '#94a3b8' }}
                                    />
                                    <span>{status.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'notification_target':
        return (
          <div key={field.name} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
              <Select
                value={config.target_type || ''}
                onValueChange={(value) => {
                  const newConfig: Record<string, any> = { ...config, target_type: value };
                  if (value !== 'specific_users') {
                    delete newConfig.user_ids;
                    delete newConfig.user_id;
                  }
                  onConfigChange(newConfig);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destinatário..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific_users">Usuários específicos</SelectItem>
                  <SelectItem value="task_creator">Criador da tarefa</SelectItem>
                  <SelectItem value="task_assignees">Responsáveis da tarefa</SelectItem>
                  <SelectItem value="task_followers">Seguidores da tarefa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.target_type === 'specific_users' && (
              <UserMultiSelect
                label="Usuários"
                users={members?.map(m => ({
                  id: m.user_id,
                  full_name: m.profile?.full_name || null,
                  avatar_url: m.profile?.avatar_url || null
                })) || []}
                selectedIds={config.user_ids || (config.user_id ? [config.user_id] : [])}
                onSelectionChange={(ids) => handleFieldChange('user_ids', ids)}
                required
              />
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              type="number"
              value={config[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              value={config[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Digite ${field.label.toLowerCase()}...`}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="font-medium text-sm">Configurar ação</h4>
      {action.configFields.map(renderField)}
    </div>
  );
};

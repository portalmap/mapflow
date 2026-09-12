import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowRight, Zap, Target, X, LayoutGrid, Folder, List, Filter } from 'lucide-react';
import { TriggerSelector } from '@/components/automations/advanced/TriggerSelector';
import { ActionSelector } from '@/components/automations/advanced/ActionSelector';
import { ActionConfigForm } from '@/components/automations/advanced/ActionConfigForm';
// TriggerConfigForm is now inline in TriggerSelector
import { ConditionsBuilder } from '@/components/automations/advanced/ConditionsBuilder';
import { MultiActionSelector, type AutomationAction } from '@/components/automations/advanced/MultiActionSelector';
import { getTriggerById, getCategoryByTriggerId } from '@/components/automations/advanced/triggerCategories';
import { getActionById } from '@/components/automations/advanced/actionCategories';
import { 
  useCreateTemplateAutomation, 
  useUpdateTemplateAutomation,
  type TemplateAutomation 
} from '@/hooks/useTemplateAutomations';
import {
  useCreateAutomationTemplateRule,
  useUpdateAutomationTemplateRule,
  type AutomationTemplateRule,
  type AutomationTemplateTarget,
} from '@/hooks/useAutomationTemplates';
import type { SpaceTemplateFolder, SpaceTemplateList } from '@/hooks/useSpaceTemplates';
import type { AutomationCondition } from '@/components/automations/advanced/ConditionRow';
import { toast } from 'sonner';

interface TemplateAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  folders: SpaceTemplateFolder[];
  lists: SpaceTemplateList[];
  automation?: TemplateAutomation | null;
  workspaceId: string;
  /** Escopos permitidos dentro do modelo. Padrão: todos (modelo de Space). */
  allowedScopes?: Array<'space' | 'folder' | 'list'>;
  storageMode?: 'structural' | 'standalone';
  standaloneTargetType?: AutomationTemplateTarget;
  standaloneRule?: AutomationTemplateRule | null;
}

type BuilderStep = 'trigger' | 'action';

const generateId = () => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function TemplateAutomationDialog({ 
  open, 
  onOpenChange,
  templateId,
  folders,
  lists,
  automation,
  workspaceId,
  allowedScopes = ['space', 'folder', 'list'],
  storageMode = 'structural',
  standaloneTargetType,
  standaloneRule,
}: TemplateAutomationDialogProps) {
  const defaultScope = standaloneTargetType || allowedScopes[0];
  const createAutomation = useCreateTemplateAutomation();
  const updateAutomation = useUpdateTemplateAutomation();
  const createStandaloneRule = useCreateAutomationTemplateRule();
  const updateStandaloneRule = useUpdateAutomationTemplateRule();
  const activeAutomation = storageMode === 'standalone' ? standaloneRule : automation;

  const isEditMode = !!activeAutomation;

  const [name, setName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [scopeType, setScopeType] = useState<'space' | 'folder' | 'list'>(defaultScope);
  const [folderRefId, setFolderRefId] = useState<string | undefined>();
  const [listRefId, setListRefId] = useState<string | undefined>();
  const [activeStep, setActiveStep] = useState<BuilderStep>('trigger');
  const [showConditions, setShowConditions] = useState(false);
  const [useMultipleActions, setUseMultipleActions] = useState(false);

  // Populate fields when editing
  useEffect(() => {
    if (activeAutomation && open) {
      setName(activeAutomation.description || '');
      setSelectedTrigger(activeAutomation.trigger);
      setScopeType(storageMode === 'standalone' ? defaultScope : automation?.scope_type || defaultScope);
      setFolderRefId(storageMode === 'structural' ? automation?.folder_ref_id || undefined : undefined);
      setListRefId(storageMode === 'structural' ? automation?.list_ref_id || undefined : undefined);
      setActiveStep('trigger');

      // Handle legacy single action or new multiple actions
      const config = activeAutomation.action_config || {};
      
      // Reconstruct OR triggers
      const orTriggers = (config.or_triggers as string[] | undefined) || [];
      setSelectedTriggers([automation.trigger, ...orTriggers]);

      if (config.actions && Array.isArray(config.actions)) {
        setUseMultipleActions(true);
        setActions(config.actions);
        setSelectedAction(null);
        setActionConfig(config);
      } else {
        setUseMultipleActions(false);
        setSelectedAction(activeAutomation.action_type);
        setActionConfig(config);
        setActions([]);
      }

      // Load conditions
      if (config.conditions && Array.isArray(config.conditions)) {
        setConditions(config.conditions);
        setShowConditions(true);
      } else {
        setConditions([]);
        setShowConditions(false);
      }
    }
  }, [activeAutomation, automation, defaultScope, open, storageMode]);

  // Modelos de Pasta/Lista têm um único destino possível: já pré-seleciona.
  useEffect(() => {
    if (!open) return;
    if (scopeType === 'folder' && !folderRefId && folders.length === 1) {
      setFolderRefId(folders[0].id);
    }
    if (scopeType === 'list' && !listRefId && lists.length === 1) {
      setListRefId(lists[0].id);
    }
  }, [open, scopeType, folderRefId, listRefId, folders, lists]);


  const resetForm = () => {
    setName('');
    setSelectedTrigger(null);
    setSelectedTriggers([]);
    setSelectedAction(null);
    setActionConfig({});
    setConditions([]);
    setActions([]);
    setScopeType(defaultScope);
    setFolderRefId(undefined);
    setListRefId(undefined);
    setActiveStep('trigger');
    setShowConditions(false);
    setUseMultipleActions(false);
  };

  const handleClose = () => {
    if (!isEditMode) {
      resetForm();
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (selectedTriggers.length === 0 && !selectedTrigger) {
      toast.error('Selecione um gatilho');
      return;
    }

    // Validate actions
    if (useMultipleActions) {
      if (actions.length === 0) {
        toast.error('Adicione pelo menos uma ação');
        return;
      }
      const incompleteAction = actions.find(a => !a.type);
      if (incompleteAction) {
        toast.error('Complete a configuração de todas as ações');
        return;
      }
    } else {
      if (!selectedAction) {
        toast.error('Selecione uma ação');
        return;
      }
      const action = getActionById(selectedAction);
      if (action?.configFields) {
        for (const field of action.configFields) {
          if (field.required && !actionConfig[field.name]) {
            toast.error(`Preencha o campo: ${field.label}`);
            return;
          }
        }
      }
    }

    // Validate scope
    if (storageMode === 'structural' && scopeType === 'folder' && !folderRefId) {
      toast.error('Selecione uma pasta');
      return;
    }
    if (storageMode === 'structural' && scopeType === 'list' && !listRefId) {
      toast.error('Selecione uma lista');
      return;
    }

    // Determine primary trigger and OR triggers
    const primaryTriggerId = selectedTriggers.length > 0 ? selectedTriggers[0] : selectedTrigger!;
    const orTriggerIds = selectedTriggers.length > 1 ? selectedTriggers.slice(1) : [];

    const trigger = getTriggerById(primaryTriggerId);
    
    // Build final action config
    const finalActionConfig: Record<string, any> = {
      ...actionConfig,
    };

    // Add OR triggers if any
    if (orTriggerIds.length > 0) {
      finalActionConfig.or_triggers = orTriggerIds;
    } else {
      delete finalActionConfig.or_triggers;
    }

    // Add conditions if any
    if (conditions.length > 0) {
      finalActionConfig.conditions = conditions;
    }

    // Add multiple actions if using that mode
    if (useMultipleActions) {
      finalActionConfig.actions = actions;
    }

    // Determine primary action type
    const primaryActionType = useMultipleActions 
      ? (actions[0]?.type || 'set_status') 
      : selectedAction;

    const primaryAction = getActionById(primaryActionType || '');
    const description = name || `Quando ${trigger?.label} → ${useMultipleActions ? `${actions.length} ações` : primaryAction?.label}`;

    try {
      if (storageMode === 'standalone') {
        if (isEditMode && standaloneRule) {
          await updateStandaloneRule.mutateAsync({
            id: standaloneRule.id,
            automation_template_id: templateId,
            description,
            trigger: primaryTriggerId as any,
            action_type: primaryActionType as any,
            action_config: finalActionConfig,
          });
        } else {
          await createStandaloneRule.mutateAsync({
            automationTemplateId: templateId,
            description,
            trigger: primaryTriggerId as any,
            actionType: primaryActionType as any,
            actionConfig: finalActionConfig,
          });
        }
      } else if (isEditMode && automation) {
        await updateAutomation.mutateAsync({
          id: automation.id,
          templateId,
          description,
          trigger: primaryTriggerId as any,
          action_type: primaryActionType as any,
          action_config: finalActionConfig,
          scope_type: scopeType,
          folder_ref_id: scopeType === 'folder' ? folderRefId : null,
          list_ref_id: scopeType === 'list' ? listRefId : null,
        });
      } else {
        await createAutomation.mutateAsync({
          templateId,
          description,
          trigger: primaryTriggerId as any,
          actionType: primaryActionType as any,
          actionConfig: finalActionConfig,
          scopeType,
          folderRefId: scopeType === 'folder' ? folderRefId : undefined,
          listRefId: scopeType === 'list' ? listRefId : undefined,
        });
      }

      handleClose();
    } catch (error) {
      console.error('Erro ao salvar automação:', error);
    }
  };

  const isPending = createAutomation.isPending || updateAutomation.isPending || createStandaloneRule.isPending || updateStandaloneRule.isPending;

  const selectedTriggersData = selectedTriggers.map(id => getTriggerById(id)).filter(Boolean);
  const selectedTriggerCategory = selectedTriggers.length > 0 ? getCategoryByTriggerId(selectedTriggers[0]) : null;
  const selectedActionData = selectedAction ? getActionById(selectedAction) : null;

  // Get lists for current folder context
  const getAvailableLists = () => {
    if (folderRefId) {
      return lists.filter(l => l.folder_ref_id === folderRefId);
    }
    return lists;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditMode ? 'Editar Automação do Template' : 'Nova Automação para Template'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Esta automação será aplicada quando o template for usado.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Name Input */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da automação (opcional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dê um nome a essa regra de automação..."
            />
          </div>

          {/* Template Scope Selector */}
          {storageMode === 'structural' ? <div className="space-y-2">
            <Label className="text-xs">Escopo dentro do Template</Label>
            
            <Select value={scopeType} onValueChange={(v) => {
              setScopeType(v as 'space' | 'folder' | 'list');
              setFolderRefId(undefined);
              setListRefId(undefined);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Onde aplicar" />
              </SelectTrigger>
              <SelectContent>
                {allowedScopes.includes('space') && (
                  <SelectItem value="space">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      <span>Todo o Space (do template)</span>
                    </div>
                  </SelectItem>
                )}
                {allowedScopes.includes('folder') && folders.length > 0 && (
                  <SelectItem value="folder">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span>{allowedScopes.includes('space') ? 'Pasta específica' : 'Toda a pasta (do template)'}</span>
                    </div>
                  </SelectItem>
                )}
                {allowedScopes.includes('list') && lists.length > 0 && (
                  <SelectItem value="list">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      <span>Lista específica</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Folder selector */}
            {scopeType === 'folder' && folders.length > 0 && (
              <Select value={folderRefId || ''} onValueChange={setFolderRefId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a pasta" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        <span>{folder.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* List selector */}
            {scopeType === 'list' && lists.length > 0 && (
              <Select value={listRefId || ''} onValueChange={setListRefId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a lista" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableLists().map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <div className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        <span>{list.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div> : (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              Esta regra será aplicada em todas as {standaloneTargetType === 'space' ? 'Spaces' : standaloneTargetType === 'folder' ? 'Pastas' : 'Listas'} selecionadas.
            </div>
          )}

          {/* Trigger → Action Flow */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-start">
            {/* Left Column: Trigger + Conditions */}
            <div className="space-y-3">
              {/* Trigger Card */}
              <Card 
                className={`p-3 cursor-pointer transition-all ${
                  activeStep === 'trigger' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setActiveStep('trigger')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-xs">Gatilho</span>
                  {selectedTriggerCategory && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {selectedTriggerCategory.name}
                    </Badge>
                  )}
                </div>

                {selectedTriggersData.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedTriggersData.map((triggerData, idx) => {
                      const TriggerIcon = triggerData!.icon;
                      return (
                      <div key={triggerData!.id}>
                        {idx > 0 && (
                          <div className="flex items-center justify-center my-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold text-primary border-primary/30">
                              OU
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center gap-2 p-1.5 bg-accent rounded-md">
                          <TriggerIcon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">{triggerData!.label}</span>
                          {selectedTriggersData.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newTriggers = selectedTriggers.filter(id => id !== triggerData!.id);
                                setSelectedTriggers(newTriggers);
                                setSelectedTrigger(newTriggers[0] || null);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                    {selectedTriggersData.length === 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute top-3 right-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrigger(null);
                          setSelectedTriggers([]);
                          const { trigger_config, or_triggers, ...rest } = actionConfig;
                          setActionConfig(rest);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar um ou mais gatilhos
                  </p>
                )}

                {activeStep === 'trigger' && workspaceId && (
                  <div className="mt-3 border-t pt-3">
                    <TriggerSelector
                      selectedTrigger={selectedTrigger}
                      selectedTriggers={selectedTriggers}
                      onSelectTrigger={(id) => {
                        setSelectedTrigger(id);
                        setSelectedTriggers([id]);
                        setActiveStep('action');
                      }}
                      onToggleTrigger={(id) => {
                        setSelectedTriggers(prev => {
                          const newTriggers = prev.includes(id)
                            ? prev.filter(t => t !== id)
                            : [...prev, id];
                          setSelectedTrigger(newTriggers[0] || null);
                          return newTriggers;
                        });
                      }}
                      workspaceId={workspaceId}
                      scopeType={storageMode === 'standalone' ? scopeType : scopeType === 'space' ? 'workspace' : scopeType}
                      scopeId={scopeType === 'list' ? listRefId : scopeType === 'folder' ? folderRefId : undefined}
                      config={actionConfig}
                      onConfigChange={setActionConfig}
                      isTemplateContext={storageMode === 'structural'}
                      templateLists={lists.map(l => ({
                        id: l.id,
                        name: l.name,
                        folder_ref_id: l.folder_ref_id,
                        status_template_id: l.status_template_id
                      }))}
                    />
                  </div>
                )}
              </Card>

              {/* Conditions Section - Below Trigger */}
              <Collapsible open={showConditions} onOpenChange={setShowConditions}>
                <div className="relative pl-4">
                  {/* Connection line */}
                  <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
                  
                  <Card className="border-l-2 border-primary/30">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 rounded-t-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            E se essa condição for verdadeira:
                          </span>
                          {conditions.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {conditions.length}
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          {showConditions ? 'Ocultar' : 'Mostrar'}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3">
                      <ConditionsBuilder
                        workspaceId={workspaceId}
                        conditions={conditions}
                        onConditionsChange={setConditions}
                      />
                    </CollapsibleContent>
                  </Card>
                </div>
              </Collapsible>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center h-full pt-12">
              <div className="p-2 rounded-full bg-muted">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Action Card */}
            <Card 
              className={`p-4 cursor-pointer transition-all ${
                activeStep === 'action' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveStep('action')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Ação</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUseMultipleActions(!useMultipleActions);
                    if (!useMultipleActions) {
                      // Switch to multiple: convert current action to array
                      if (selectedAction) {
                        setActions([{ id: generateId(), type: selectedAction, config: actionConfig }]);
                        setSelectedAction(null);
                      }
                    } else {
                      // Switch to single: take first action
                      if (actions.length > 0) {
                        setSelectedAction(actions[0].type);
                        setActionConfig({ ...actionConfig, ...actions[0].config });
                      }
                      setActions([]);
                    }
                  }}
                >
                  {useMultipleActions ? 'Ação única' : 'Múltiplas ações'}
                </Button>
              </div>

              {useMultipleActions ? (
                <MultiActionSelector
                  workspaceId={workspaceId}
                  actions={actions}
                  onActionsChange={setActions}
                  scopeType={scopeType}
                  scopeId={listRefId || folderRefId}
                  isTemplateContext={storageMode === 'structural'}
                  templateLists={lists.map(l => ({ id: l.id, name: l.name, folder_ref_id: l.folder_ref_id, status_template_id: l.status_template_id }))}
                  templateFolders={folders.map(f => ({ id: f.id, name: f.name }))}
                />
              ) : (
                <>
                  {selectedActionData ? (
                    <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
                      <selectedActionData.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{selectedActionData.label}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAction(null);
                          // Keep trigger_config and conditions
                          const { trigger_config, conditions: conds, ...rest } = actionConfig;
                          setActionConfig({ trigger_config, conditions: conds });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar uma ação
                    </p>
                  )}

                  {activeStep === 'action' && !selectedAction && (
                    <div className="mt-4 border-t pt-4">
                      <ActionSelector
                        selectedAction={selectedAction}
                        onSelectAction={setSelectedAction}
                      />
                    </div>
                  )}

                  {/* Action Config Form */}
                  {selectedAction && (
                    <ActionConfigForm
                      actionId={selectedAction}
                      workspaceId={workspaceId}
                      config={actionConfig}
                      onConfigChange={setActionConfig}
                      scopeType={scopeType}
                      scopeId={listRefId || folderRefId}
                      isTemplateContext={storageMode === 'structural'}
                      templateLists={lists.map(l => ({ id: l.id, name: l.name, folder_ref_id: l.folder_ref_id, status_template_id: l.status_template_id }))}
                      templateFolders={folders.map(f => ({ id: f.id, name: f.name }))}
                    />
                  )}
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={(selectedTriggers.length === 0 && !selectedTrigger) || (!useMultipleActions && !selectedAction) || (useMultipleActions && actions.length === 0) || isPending}
          >
            {isPending 
              ? (isEditMode ? 'Salvando...' : 'Adicionando...') 
              : (isEditMode ? 'Salvar Alterações' : 'Adicionar Automação')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { ArrowRight, Zap, Target, X, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCreateAutomation, useUpdateAutomation, type Automation } from '@/hooks/useAutomations';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TriggerSelector } from './TriggerSelector';
import { ActionSelector } from './ActionSelector';
import { ActionConfigForm, validateDateConfig } from './ActionConfigForm';
// TriggerConfigForm is now inline in TriggerSelector
import { ConditionsBuilder } from './ConditionsBuilder';
import { MultiActionSelector, type AutomationAction } from './MultiActionSelector';
import { getTriggerById, getCategoryByTriggerId } from './triggerCategories';
import { getActionById } from './actionCategories';
import { ScopeSelector } from '../ScopeSelector';
import { toast } from 'sonner';
import type { AutomationCondition } from './ConditionRow';

interface AdvancedAutomationBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  automation?: Automation; // Para modo edição
}

type BuilderStep = 'trigger' | 'action';
type ScopeType = 'workspace' | 'space' | 'folder' | 'list';

export const AdvancedAutomationBuilder = ({ 
  open, 
  onOpenChange, 
  workspaceId,
  automation
}: AdvancedAutomationBuilderProps) => {
  const { activeWorkspace } = useWorkspace();
  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();

  const isEditMode = !!automation;

  const [name, setName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [scope, setScope] = useState<{ scopeType: ScopeType; scopeId?: string }>({ 
    scopeType: 'workspace' 
  });
  const [activeStep, setActiveStep] = useState<BuilderStep>('trigger');
  const [showConditions, setShowConditions] = useState(false);
  const [useMultipleActions, setUseMultipleActions] = useState(false);

  // Preencher campos quando estiver em modo edição
  useEffect(() => {
    if (automation && open) {
      setName(automation.description || '');
      setSelectedTrigger(automation.trigger);
      
      // Handle legacy single action or new multiple actions
      const config = automation.action_config || {};
      
      // Reconstruct OR triggers
      const orTriggers = (config.or_triggers as string[] | undefined) || [];
      setSelectedTriggers([automation.trigger, ...orTriggers]);
      
      if (config.actions && Array.isArray(config.actions)) {
        setUseMultipleActions(true);
        setActions(config.actions);
        setSelectedAction(null);
        const { actions: _, ...restConfig } = config;
        setActionConfig(restConfig);
      } else {
        setUseMultipleActions(false);
        setSelectedAction(automation.action_type);
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
      
      setScope({ 
        scopeType: automation.scope_type, 
        scopeId: automation.scope_id || undefined 
      });
      setActiveStep('trigger');
    }
  }, [automation, open]);

  const resetForm = () => {
    setName('');
    setSelectedTrigger(null);
    setSelectedTriggers([]);
    setSelectedAction(null);
    setActionConfig({});
    setConditions([]);
    setActions([]);
    setScope({ scopeType: 'workspace' });
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
          if (field.type === 'date_config') {
            const dateError = validateDateConfig(actionConfig);
            if (dateError) {
              toast.error(dateError);
              return;
            }
            continue;
          }
          if (field.required && !actionConfig[field.name]) {
            toast.error(`Preencha o campo: ${field.label}`);
            return;
          }
        }
      }
    }

    // Determine primary trigger and OR triggers
    const primaryTriggerId = selectedTriggers.length > 0 ? selectedTriggers[0] : selectedTrigger!;
    const orTriggerIds = selectedTriggers.length > 1 ? selectedTriggers.slice(1) : [];
    
    const trigger = getTriggerById(primaryTriggerId);
    
    // Build final action config with trigger_config, conditions, and actions
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

    // Determine primary action type (for DB storage)
    const primaryActionType = useMultipleActions 
      ? (actions[0]?.type || 'set_status') 
      : selectedAction;

    const primaryAction = getActionById(primaryActionType || '');
    const triggerLabels = selectedTriggers.map(id => getTriggerById(id)?.label).filter(Boolean);
    const triggerDesc = triggerLabels.length > 1 ? triggerLabels.join(' OU ') : (trigger?.label || '');
    const description = name || `Quando ${triggerDesc} → ${useMultipleActions ? `${actions.length} ações` : primaryAction?.label}`;

    try {
      if (isEditMode && automation) {
        await updateAutomation.mutateAsync({
          id: automation.id,
          description,
          trigger: primaryTriggerId as any,
          action_type: primaryActionType as any,
          action_config: finalActionConfig,
          scope_type: scope.scopeType,
          scope_id: scope.scopeId || null,
        });
      } else {
        await createAutomation.mutateAsync({
          workspaceId,
          description,
          trigger: primaryTriggerId as any,
          actionType: primaryActionType as any,
          actionConfig: finalActionConfig,
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
        });
      }

      handleClose();
    } catch (error) {
      console.error('Erro ao salvar automação:', error);
    }
  };

  const isPending = createAutomation.isPending || updateAutomation.isPending;

  const selectedTriggersData = selectedTriggers.map(id => getTriggerById(id)).filter(Boolean);
  const selectedTriggerData = selectedTriggersData.length > 0 ? selectedTriggersData[0] : null;
  const selectedTriggerCategory = selectedTriggers.length > 0 ? getCategoryByTriggerId(selectedTriggers[0]) : null;
  const selectedActionData = selectedAction ? getActionById(selectedAction) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {isEditMode ? 'Editar Automação' : 'Nova Automação'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Localizado em: {activeWorkspace?.name || 'Workspace'}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label>Nome da automação (opcional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dê um nome a essa regra de automação..."
            />
          </div>

          {/* Scope Selector */}
          <div className="space-y-2">
            <Label>Escopo</Label>
            <ScopeSelector
              workspaceId={workspaceId}
              value={scope}
              onChange={setScope}
            />
          </div>

          {/* Trigger → Action Flow */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-start">
            {/* Left Column: Trigger + Conditions */}
            <div className="space-y-3">
              {/* Trigger Card */}
              <Card 
                className={`p-4 cursor-pointer transition-all relative ${
                  activeStep === 'trigger' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setActiveStep('trigger')}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Gatilho</span>
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
                          <TriggerLogicToggle
                            value={triggerLogics[idx - 1] || 'OR'}
                            onChange={(logic) => {
                              setTriggerLogics(prev => {
                                const next = [...prev];
                                while (next.length < selectedTriggers.length - 1) next.push('OR');
                                next[idx - 1] = logic;
                                return next;
                              });
                            }}
                          />
                        )}
                        <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
                          <TriggerIcon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{triggerData!.label}</span>
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
                        className="h-6 w-6 absolute top-4 right-4"
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

                {activeStep === 'trigger' && (
                  <div className="mt-4 border-t pt-4">
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
                      scopeType={scope.scopeType}
                      scopeId={scope.scopeId}
                      config={actionConfig}
                      onConfigChange={setActionConfig}
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
                              {conditions.length > 1 && (
                                <>
                                  {' · '}
                                  {conditions.slice(0, -1).every(c => c.logic === 'AND')
                                    ? 'todas'
                                    : conditions.slice(0, -1).every(c => c.logic === 'OR')
                                      ? 'qualquer'
                                      : 'personalizado'}
                                </>
                              )}
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
                        setActionConfig(actions[0].config);
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
                  scopeType={scope.scopeType}
                  scopeId={scope.scopeId}
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
                          // Keep trigger_config and conditions, clear action-specific config
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
                      scopeType={scope.scopeType}
                      scopeId={scope.scopeId}
                    />
                  )}
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedTriggers.length === 0 || (!useMultipleActions && !selectedAction) || (useMultipleActions && actions.length === 0) || isPending}
          >
            {isPending 
              ? (isEditMode ? 'Salvando...' : 'Criando...') 
              : (isEditMode ? 'Salvar Alterações' : 'Criar Automação')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

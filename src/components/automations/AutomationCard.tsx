import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Folder, List, LayoutGrid, Building2, ArrowRight, Zap, Pencil, Copy } from 'lucide-react';
import { useToggleAutomation, useDeleteAutomation, type Automation, type AutomationScope } from '@/hooks/useAutomations';
import { getTriggerById } from './advanced/triggerCategories';
import { getActionById } from './advanced/actionCategories';
import { AdvancedAutomationBuilder } from './advanced/AdvancedAutomationBuilder';
import { DuplicateAutomationDialog } from './DuplicateAutomationDialog';

interface AutomationCardProps {
  automation: Automation;
  spaces?: Array<{ id: string; name: string; color?: string | null }>;
  lists?: Array<{ id: string; space_id: string }>;
  folders?: Array<{ id: string; space_id: string }>;
}

const getScopeIcon = (scope: AutomationScope) => {
  switch (scope) {
    case 'workspace': return <Building2 className="h-3.5 w-3.5" />;
    case 'space': return <LayoutGrid className="h-3.5 w-3.5" />;
    case 'folder': return <Folder className="h-3.5 w-3.5" />;
    case 'list': return <List className="h-3.5 w-3.5" />;
  }
};

const getScopeLabel = (scope: AutomationScope) => {
  switch (scope) {
    case 'workspace': return 'Workspace';
    case 'space': return 'Space';
    case 'folder': return 'Pasta';
    case 'list': return 'Lista';
  }
};

export function AutomationCard({ automation, spaces = [], lists = [], folders = [] }: AutomationCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  const resolvedSpace = useMemo(() => {
    if (automation.scope_type === 'workspace') return null;
    if (automation.scope_type === 'space') {
      return spaces.find(s => s.id === automation.scope_id) || null;
    }
    if (automation.scope_type === 'folder') {
      const folder = folders.find(f => f.id === automation.scope_id);
      return folder ? spaces.find(s => s.id === folder.space_id) || null : null;
    }
    if (automation.scope_type === 'list') {
      const list = lists.find(l => l.id === automation.scope_id);
      return list ? spaces.find(s => s.id === list.space_id) || null : null;
    }
    return null;
  }, [automation.scope_type, automation.scope_id, spaces, lists, folders]);
  const toggleAutomation = useToggleAutomation();
  const deleteAutomation = useDeleteAutomation();

  const handleToggle = (checked: boolean) => {
    toggleAutomation.mutate({ id: automation.id, isActive: checked });
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta automação?')) {
      deleteAutomation.mutate(automation.id);
    }
  };

  const trigger = getTriggerById(automation.trigger);
  const action = getActionById(automation.action_type);
  const actionConfig = automation.action_config as Record<string, any> | null;
  
  // Build full trigger labels including OR triggers
  const orTriggers = (actionConfig?.or_triggers as string[] | undefined) || [];
  const triggerLogics = (actionConfig?.trigger_logics as ('AND' | 'OR')[] | undefined) || [];
  const allTriggerLabels = [trigger?.label || automation.trigger];
  for (const orId of orTriggers) {
    const orTrigger = getTriggerById(orId);
    if (orTrigger) allTriggerLabels.push(orTrigger.label);
  }

  // Get a summary of the action config
  const getConfigSummary = () => {
    if (!actionConfig) return null;
    const summaryParts: string[] = [];
    
    if (actionConfig.title) summaryParts.push(`"${actionConfig.title}"`);
    if (actionConfig.status_id) summaryParts.push('Status definido');
    if (actionConfig.priority) summaryParts.push(`Prioridade: ${actionConfig.priority}`);
    if (actionConfig.message) summaryParts.push(`Msg: "${actionConfig.message.substring(0, 30)}..."`);
    
    return summaryParts.length > 0 ? summaryParts.join(' • ') : null;
  };

  const configSummary = getConfigSummary();

  return (
    <Card className={`transition-opacity ${!automation.enabled ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon and Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">
                  {automation.description || 'Automação'}
                </h4>
                <Badge variant="outline" className="gap-1 text-xs">
                  {getScopeIcon(automation.scope_type)}
                  {getScopeLabel(automation.scope_type)}
                </Badge>
                {resolvedSpace && (
                  <Badge className="gap-1 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                    <LayoutGrid className="h-3 w-3" />
                    {resolvedSpace.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                {allTriggerLabels.map((label, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 font-semibold text-primary border-primary/30">
                        {triggerLogics[idx - 1] === 'AND' ? 'E' : 'OU'}
                      </Badge>
                    )}
                    <span className="font-medium text-foreground/80">{label}</span>
                  </span>
                ))}
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium text-foreground/80">{action?.label || automation.action_type}</span>
              </div>
              {configSummary && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {configSummary}
                </p>
              )}
            </div>
          </div>

          {/* Right: Duplicate, Edit, Toggle and Delete */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setDuplicateDialogOpen(true)}
              title="Duplicar automação"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Switch
              checked={automation.enabled}
              onCheckedChange={handleToggle}
              disabled={toggleAutomation.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteAutomation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <AdvancedAutomationBuilder
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        workspaceId={automation.workspace_id}
        automation={automation}
      />

      {/* Duplicate Dialog */}
      <DuplicateAutomationDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        automation={automation}
        workspaceId={automation.workspace_id}
      />
    </Card>
  );
}

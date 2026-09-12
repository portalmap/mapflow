import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Copy, Edit, Plus, Trash2, Zap } from 'lucide-react';
import { getTriggerById } from '@/components/automations/advanced/triggerCategories';
import { getActionById } from '@/components/automations/advanced/actionCategories';
import { TemplateAutomationDialog } from './TemplateAutomationDialog';
import {
  type AutomationTemplateModel,
  type AutomationTemplateRule,
  useAutomationTemplateRules,
  useDeleteAutomationTemplateRule,
  useDuplicateAutomationTemplateRule,
  useUpdateAutomationTemplateRule,
} from '@/hooks/useAutomationTemplates';

export function AutomationTemplateRuleList({ template }: { template: AutomationTemplateModel }) {
  const { data: rules = [], isLoading } = useAutomationTemplateRules(template.id);
  const updateRule = useUpdateAutomationTemplateRule();
  const deleteRule = useDeleteAutomationTemplateRule();
  const duplicateRule = useDuplicateAutomationTemplateRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationTemplateRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Regras do modelo</h3>
          <p className="text-sm text-muted-foreground">Somente automações para {template.target_type === 'space' ? 'Spaces' : template.target_type === 'folder' ? 'Pastas' : 'Listas'}.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma automação configurada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const trigger = getTriggerById(rule.trigger);
            const action = getActionById(rule.action_type);
            return (
              <div key={rule.id} className={`flex items-center gap-3 rounded-lg border p-3 ${rule.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(enabled) => updateRule.mutate({ id: rule.id, automation_template_id: template.id, enabled })}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{rule.description || `${trigger?.label} → ${action?.label}`}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{trigger?.label || rule.trigger}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline">{action?.label || rule.action_type}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" title="Editar" onClick={() => { setEditingRule(rule); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicateRule.mutate(rule)}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Excluir" className="text-destructive" onClick={() => setDeleteId(rule.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
      )}

      <TemplateAutomationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templateId={template.id}
        folders={[]}
        lists={[]}
        workspaceId={template.workspace_id}
        storageMode="standalone"
        standaloneTargetType={template.target_type}
        standaloneRule={editingRule}
        allowedScopes={[template.target_type]}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir automação?</AlertDialogTitle><AlertDialogDescription>Esta regra será removida somente deste modelo.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteRule.mutate({ id: deleteId, templateId: template.id }); setDeleteId(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
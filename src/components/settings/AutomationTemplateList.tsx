import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  type AutomationTemplateModel,
  type AutomationTemplateTarget,
  useAutomationTemplateRules,
  useAutomationTemplates,
  useDeleteAutomationTemplate,
  useDuplicateAutomationTemplate,
} from '@/hooks/useAutomationTemplates';
import { ApplyAutomationTemplateDialog } from './ApplyAutomationTemplateDialog';
import { AutomationTemplateFormDialog } from './AutomationTemplateFormDialog';
import { Loader2, MoreHorizontal, Pencil, Zap, Send, Copy, Trash2 } from 'lucide-react';

interface AutomationTemplateListProps {
  workspaceId: string;
  targetType: AutomationTemplateTarget;
  onEdit: (templateId: string) => void;
}

const TemplateRow = ({
  template,
  onEdit,
  onApply,
  onDuplicate,
  onDelete,
}: {
  template: AutomationTemplateModel;
  onEdit: (id: string) => void;
  onApply: (template: AutomationTemplateModel) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const { data: automations = [] } = useAutomationTemplateRules(template.id);
  const enabledCount = automations.filter((automation) => automation.enabled).length;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded-full bg-primary" />
        <div>
          <p className="font-medium">{template.name}</p>
          <p className="text-sm text-muted-foreground">
            {automations.length} {automations.length === 1 ? 'automação' : 'automações'}
            {enabledCount < automations.length && (
              <span> ({enabledCount} {enabledCount === 1 ? 'ativa' : 'ativas'})</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          {enabledCount}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(template.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar modelo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onApply(template)}>
              <Send className="h-4 w-4 mr-2" />
              Aplicar automações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(template.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export const AutomationTemplateList = ({ workspaceId, targetType, onEdit }: AutomationTemplateListProps) => {
  const { data: templates = [], isLoading } = useAutomationTemplates(workspaceId, targetType);
  const [applyTemplate, setApplyTemplate] = useState<AutomationTemplateModel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const duplicateTemplate = useDuplicateAutomationTemplate();
  const deleteTemplate = useDeleteAutomationTemplate();

  const handleDuplicate = (templateId: string) => {
    duplicateTemplate.mutate(templateId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="font-medium">Modelos de {targetType === 'space' ? 'Spaces' : targetType === 'folder' ? 'Pastas' : 'Listas'}</h3><Button size="sm" onClick={() => setCreateOpen(true)}>Criar modelo</Button></div>
      {templates.length === 0 ? <div className="rounded-lg border border-dashed py-10 text-center"><Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhum modelo exclusivo criado para este tipo.</p></div> : <div className="space-y-2">
        {templates.map((template) => (
          <TemplateRow
            key={template.id}
            template={template}
            onEdit={onEdit}
            onApply={setApplyTemplate}
            onDuplicate={handleDuplicate}
            onDelete={setDeleteId}
          />
        ))}
      </div>}

      {applyTemplate && <ApplyAutomationTemplateDialog open={!!applyTemplate} onOpenChange={(open) => { if (!open) setApplyTemplate(null); }} template={applyTemplate} />}
      <AutomationTemplateFormDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} targetType={targetType} onSaved={(template) => onEdit(template.id)} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir modelo?</AlertDialogTitle><AlertDialogDescription>O modelo e suas regras serão removidos. As automações já aplicadas continuarão nos destinos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteTemplate.mutate(deleteId); setDeleteId(null); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};

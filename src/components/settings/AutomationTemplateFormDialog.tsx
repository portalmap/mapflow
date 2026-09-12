import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  type AutomationTemplateModel,
  type AutomationTemplateTarget,
  useCreateAutomationTemplate,
  useUpdateAutomationTemplate,
} from '@/hooks/useAutomationTemplates';

export function AutomationTemplateFormDialog({
  open,
  onOpenChange,
  workspaceId,
  targetType,
  template,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  targetType: AutomationTemplateTarget;
  template?: AutomationTemplateModel | null;
  onSaved?: (template: AutomationTemplateModel) => void;
}) {
  const createTemplate = useCreateAutomationTemplate();
  const updateTemplate = useUpdateAutomationTemplate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(template?.name || '');
    setDescription(template?.description || '');
  }, [open, template]);

  const save = async () => {
    if (!name.trim()) return;
    const saved = template
      ? await updateTemplate.mutateAsync({ id: template.id, name: name.trim(), description: description.trim() || null })
      : await createTemplate.mutateAsync({ workspaceId, targetType, name: name.trim(), description: description.trim() || undefined });
    onOpenChange(false);
    onSaved?.(saved);
  };

  const label = targetType === 'space' ? 'Space' : targetType === 'folder' ? 'Pasta' : 'Lista';
  const pending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar modelo de automação' : `Novo modelo para ${label}`}</DialogTitle>
          <DialogDescription>Este modelo guardará apenas automações e só poderá ser aplicado em {label}s.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label htmlFor="automation-template-name">Nome</Label><Input id="automation-template-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={`Ex.: Fluxo padrão de ${label}`} /></div>
          <div className="space-y-2"><Label htmlFor="automation-template-description">Descrição</Label><Textarea id="automation-template-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Quando este modelo deve ser utilizado?" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!name.trim() || pending} onClick={save}>{pending ? 'Salvando...' : 'Salvar'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
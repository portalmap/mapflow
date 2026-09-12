import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, Send, Pencil } from 'lucide-react';
import { AutomationTemplateList } from './AutomationTemplateList';
import { AutomationTemplateRuleList } from './AutomationTemplateRuleList';
import { ApplyAutomationTemplateDialog } from './ApplyAutomationTemplateDialog';
import { AutomationTemplateFormDialog } from './AutomationTemplateFormDialog';
import { type AutomationTemplateTarget, useAutomationTemplate } from '@/hooks/useAutomationTemplates';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Skeleton } from '@/components/ui/skeleton';

export const AutomationTemplateSettings = () => {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [activeType, setActiveType] = useState<AutomationTemplateTarget>('space');
  const { activeWorkspace } = useWorkspace();

  const { data: template, isLoading: templateLoading } = useAutomationTemplate(editingTemplateId || undefined);

  if (editingTemplateId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditingTemplateId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          {templateLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {template?.name}
            </h3>
          )}
          <div className="ml-auto">
            <Button size="sm" variant="ghost" onClick={() => setEditDetailsOpen(true)}><Pencil className="h-4 w-4 mr-1" />Dados do modelo</Button>
            <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)}>
              <Send className="h-4 w-4 mr-1" />
              Aplicar automações
            </Button>
          </div>
        </div>

        {templateLoading ? (
          <Card>
            <CardContent className="py-8">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : template ? (
          <AutomationTemplateRuleList template={template} />
        ) : null}

        {template && <ApplyAutomationTemplateDialog open={applyOpen} onOpenChange={setApplyOpen} template={template} />}
        {template && <AutomationTemplateFormDialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen} workspaceId={template.workspace_id} targetType={template.target_type} template={template} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Automação</CardTitle>
          <CardDescription>
            Crie modelos exclusivos de automação e aplique somente as regras em vários destinos compatíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeWorkspace ? <Tabs value={activeType} onValueChange={(value) => setActiveType(value as AutomationTemplateTarget)}><TabsList className="mb-4"><TabsTrigger value="space">Spaces</TabsTrigger><TabsTrigger value="folder">Pastas</TabsTrigger><TabsTrigger value="list">Listas</TabsTrigger></TabsList><TabsContent value="space"><AutomationTemplateList workspaceId={activeWorkspace.id} targetType="space" onEdit={setEditingTemplateId} /></TabsContent><TabsContent value="folder"><AutomationTemplateList workspaceId={activeWorkspace.id} targetType="folder" onEdit={setEditingTemplateId} /></TabsContent><TabsContent value="list"><AutomationTemplateList workspaceId={activeWorkspace.id} targetType="list" onEdit={setEditingTemplateId} /></TabsContent></Tabs> : null}
        </CardContent>
      </Card>
    </div>
  );
};

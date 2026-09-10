import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Zap, 
  Trash2, 
  Edit,
  Copy,
  Download,
  LayoutGrid,
  Folder,
  List as ListIcon
} from 'lucide-react';

import { 
  useTemplateAutomations, 
  useDeleteTemplateAutomation, 
  useToggleTemplateAutomation,
  useDuplicateTemplateAutomation,
  type TemplateAutomation 
} from '@/hooks/useTemplateAutomations';
import { getTriggerById } from '@/components/automations/advanced/triggerCategories';
import { getActionById } from '@/components/automations/advanced/actionCategories';
import type { SpaceTemplateFolder, SpaceTemplateList } from '@/hooks/useSpaceTemplates';
import { TemplateAutomationDialog } from './TemplateAutomationDialog';
import { ImportTemplateAutomationsDialog } from './ImportTemplateAutomationsDialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TemplateAutomationsSectionProps {
  templateId: string;
  folders: SpaceTemplateFolder[];
  lists: SpaceTemplateList[];
  workspaceId: string;
  /** Escopos disponíveis: modelo de Space usa todos, pasta usa pasta/lista, lista usa só lista. */
  allowedScopes?: Array<'space' | 'folder' | 'list'>;
  /** Texto explicativo do card (varia por tipo de modelo). */
  description?: string;
}

export function TemplateAutomationsSection({ 
  templateId, 
  folders, 
  lists,
  workspaceId,
  allowedScopes = ['space', 'folder', 'list'],
  description = 'Estas automações serão criadas automaticamente quando um Space for criado a partir deste template.',
}: TemplateAutomationsSectionProps) {
  const { data: automations = [], isLoading } = useTemplateAutomations(templateId);
  const deleteAutomation = useDeleteTemplateAutomation();
  const toggleAutomation = useToggleTemplateAutomation();
  const duplicateAutomation = useDuplicateTemplateAutomation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<TemplateAutomation | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);


  const handleEdit = (automation: TemplateAutomation) => {
    setEditingAutomation(automation);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingAutomation(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteAutomation.mutate({ id, templateId });
    setDeleteConfirmId(null);
  };

  const handleToggle = (automation: TemplateAutomation) => {
    toggleAutomation.mutate({ 
      id: automation.id, 
      templateId, 
      enabled: !automation.enabled 
    });
  };

  const handleDuplicate = (automation: TemplateAutomation) => {
    duplicateAutomation.mutate({ automation });
  };

  const getScopeLabel = (automation: TemplateAutomation) => {
    if (automation.scope_type === 'space') {
      return 'Todo o Space';
    }
    if (automation.scope_type === 'folder' && automation.folder_ref_id) {
      const folder = folders.find(f => f.id === automation.folder_ref_id);
      return folder?.name || 'Pasta';
    }
    if (automation.scope_type === 'list' && automation.list_ref_id) {
      const list = lists.find(l => l.id === automation.list_ref_id);
      return list?.name || 'Lista';
    }
    return 'Desconhecido';
  };

  const getScopeIcon = (scopeType: string) => {
    switch (scopeType) {
      case 'space': return LayoutGrid;
      case 'folder': return Folder;
      case 'list': return ListIcon;
      default: return LayoutGrid;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Automações do Template
              </CardTitle>
              <CardDescription className="mt-1">
                Estas automações serão criadas automaticamente quando um Space for criado a partir deste template.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setImportOpen(true)} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Importar
              </Button>
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Carregando...
            </div>
          ) : automations.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Nenhuma automação configurada neste template.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Sem automações aqui, não é possível aplicar em Spaces, pastas ou listas.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Download className="h-4 w-4 mr-1" />
                  Importar de existente
                </Button>
                <Button variant="outline" size="sm" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Automação
                </Button>
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((automation) => {
                const trigger = getTriggerById(automation.trigger);
                const action = getActionById(automation.action_type);
                const ScopeIcon = getScopeIcon(automation.scope_type);
                const config = (automation.action_config || {}) as Record<string, any>;
                const orTriggers = (config.or_triggers as string[] | undefined) || [];
                const allTriggerIds = [automation.trigger, ...orTriggers];
                const allTriggersData = allTriggerIds.map(id => getTriggerById(id)).filter(Boolean);

                return (
                  <div 
                    key={automation.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      automation.enabled 
                        ? 'bg-card hover:bg-accent/50' 
                        : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <Switch
                      checked={automation.enabled}
                      onCheckedChange={() => handleToggle(automation)}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {automation.description || `${trigger?.label} → ${action?.label}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {allTriggersData.map((t, idx) => (
                          <span key={t!.id} className="flex items-center gap-1">
                            {idx > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 font-semibold text-primary border-primary/30">
                                OU
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {t!.label}
                            </Badge>
                          </span>
                        ))}
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="text-xs">
                          {action?.label || automation.action_type}
                        </Badge>
                        <span className="text-muted-foreground">|</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ScopeIcon className="h-3 w-3" />
                          <span>{getScopeLabel(automation)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(automation)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(automation)}
                        disabled={duplicateAutomation.isPending}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(automation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <TemplateAutomationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templateId={templateId}
        folders={folders}
        lists={lists}
        automation={editingAutomation}
        workspaceId={workspaceId}
      />

      <ImportTemplateAutomationsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        templateId={templateId}
        workspaceId={workspaceId}
      />


      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Automação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta automação do template? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

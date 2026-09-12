import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useSpaceTemplatesWithStructure, 
  useDeleteSpaceTemplate, 
  useDuplicateSpaceTemplate,
  TemplateType 
} from '@/hooks/useSpaceTemplates';
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, FolderTree, Loader2, Zap, Folder, List } from 'lucide-react';
import { useState } from 'react';
import { ApplyTemplateAutomationsDialog } from './ApplyTemplateAutomationsDialog';
import { ApplyTemplateAutomationsToScopeDialog } from './ApplyTemplateAutomationsToScopeDialog';

interface SpaceTemplateListProps {
  onEdit: (templateId: string) => void;
  onCreate: () => void;
  type?: TemplateType;
}

const TYPE_LABELS: Record<TemplateType, { singular: string; plural: string; icon: React.ReactNode; empty: string }> = {
  space: {
    singular: 'Template de Space',
    plural: 'Templates de Space',
    icon: <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-3" />,
    empty: 'Nenhum template de Space criado ainda',
  },
  folder: {
    singular: 'Template de Pasta',
    plural: 'Templates de Pasta',
    icon: <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-3" />,
    empty: 'Nenhum template de Pasta criado ainda',
  },
  list: {
    singular: 'Template de Lista',
    plural: 'Templates de Lista',
    icon: <List className="h-12 w-12 mx-auto text-muted-foreground mb-3" />,
    empty: 'Nenhum template de Lista criado ainda',
  },
};

export const SpaceTemplateList = ({ onEdit, onCreate, type = 'space' }: SpaceTemplateListProps) => {
  const { data: templates, isLoading } = useSpaceTemplatesWithStructure(type);
  const deleteTemplate = useDeleteSpaceTemplate();
  const duplicateTemplate = useDuplicateSpaceTemplate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [applyAutomationsTemplateId, setApplyAutomationsTemplateId] = useState<string | null>(null);

  const labels = TYPE_LABELS[type];

  const handleDelete = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const renderCounts = (template: { folderCount: number; listCount: number; taskCount: number }) => {
    if (type === 'list') {
      return `${template.taskCount} ${template.taskCount === 1 ? 'tarefa' : 'tarefas'}`;
    }
    if (type === 'folder') {
      return `${template.listCount} ${template.listCount === 1 ? 'lista' : 'listas'}, ${template.taskCount} ${template.taskCount === 1 ? 'tarefa' : 'tarefas'}`;
    }
    return `${template.folderCount} ${template.folderCount === 1 ? 'pasta' : 'pastas'}, ${template.listCount} ${template.listCount === 1 ? 'lista' : 'listas'}, ${template.taskCount} ${template.taskCount === 1 ? 'tarefa' : 'tarefas'}`;
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{labels.plural}</h3>
        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Criar Template
        </Button>
      </div>

      {templates && templates.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          {labels.icon}
          <p className="text-muted-foreground mb-4">
            {labels.empty}
          </p>
          <Button onClick={onCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates?.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: template.color || '#6366f1' }}
                />
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {renderCounts(template)}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(template.id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => duplicateTemplate.mutate(template.id)}
                    disabled={duplicateTemplate.isPending}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setApplyAutomationsTemplateId(template.id)}>
                      <Zap className="h-4 w-4 mr-2" />
                      {type === 'space'
                        ? 'Aplicar Template em Spaces'
                        : type === 'folder'
                          ? 'Aplicar Template em Pastas'
                          : 'Aplicar Template em Listas'}
                    </DropdownMenuItem>
                  </>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDelete(template.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {applyAutomationsTemplateId && type !== 'space' && (
        <ApplyTemplateAutomationsToScopeDialog
          open={!!applyAutomationsTemplateId}
          onOpenChange={(open) => {
            if (!open) setApplyAutomationsTemplateId(null);
          }}
          templateId={applyAutomationsTemplateId}
          targetType={type}
        />
      )}

      {applyAutomationsTemplateId && type === 'space' && (
        <ApplyTemplateAutomationsDialog
          open={!!applyAutomationsTemplateId}
          onOpenChange={(open) => {
            if (!open) setApplyAutomationsTemplateId(null);
          }}
          templateId={applyAutomationsTemplateId}
        />
      )}
    </div>
  );
};

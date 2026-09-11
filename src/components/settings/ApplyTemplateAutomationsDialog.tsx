import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSpaces } from '@/hooks/useSpaces';
import { useSpaceTemplate } from '@/hooks/useSpaceTemplates';
import { useApplyTemplateAutomationsToSpaces } from '@/hooks/useSpaceTemplates';
import { useTemplateAutomations } from '@/hooks/useTemplateAutomations';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface ApplyTemplateAutomationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
}

export const ApplyTemplateAutomationsDialog = ({
  open,
  onOpenChange,
  templateId,
}: ApplyTemplateAutomationsDialogProps) => {
  const { activeWorkspace } = useWorkspace();
  const { data: template } = useSpaceTemplate(templateId);
  const { data: spaces, isLoading: spacesLoading } = useSpaces(activeWorkspace?.id);
  const { data: automations } = useTemplateAutomations(templateId);
  const applyAutomations = useApplyTemplateAutomationsToSpaces();

  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [result, setResult] = useState<{ spacesProcessed: number; automationsCreated: number; tasksCreated: number; errors: string[] } | null>(null);

  // Filter spaces that match the template pattern (start with the template name)
  const matchingSpaces = useMemo(() => {
    if (!spaces || !template) return [];
    const templatePrefix = template.name; // e.g., "MAP | "
    return spaces.filter(space => space.name.startsWith(templatePrefix));
  }, [spaces, template]);

  const enabledAutomationsCount = useMemo(() => {
    return automations?.filter(a => a.enabled).length || 0;
  }, [automations]);

  const handleToggleSpace = (spaceId: string) => {
    setSelectedSpaceIds(prev =>
      prev.includes(spaceId)
        ? prev.filter(id => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSpaceIds.length === matchingSpaces.length) {
      setSelectedSpaceIds([]);
    } else {
      setSelectedSpaceIds(matchingSpaces.map(s => s.id));
    }
  };

  const handleApply = async () => {
    if (!activeWorkspace || selectedSpaceIds.length === 0) return;

    const res = await applyAutomations.mutateAsync({
      templateId,
      workspaceId: activeWorkspace.id,
      spaceIds: selectedSpaceIds,
    });

    setResult(res);
  };

  const handleClose = () => {
    setSelectedSpaceIds([]);
    setResult(null);
    onOpenChange(false);
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result.errors.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
              Aplicação Concluída
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.spacesProcessed}</div>
                <div className="text-xs text-muted-foreground">Spaces processados</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{result.automationsCreated}</div>
                <div className="text-xs text-muted-foreground">Automações criadas</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{result.tasksCreated}</div>
                <div className="text-xs text-muted-foreground">Tarefas criadas</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-xs font-medium text-destructive mb-2">
                  {result.errors.length} erro(s):
                </p>
                <ul className="text-xs text-destructive/80 space-y-1">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... e mais {result.errors.length - 5} erros</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Aplicar Automações em Spaces
          </DialogTitle>
          <DialogDescription>
            Aplique as automações e as tarefas do template "{template?.name}" em spaces existentes que seguem o mesmo padrão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Automation count */}
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <span className="text-xs text-muted-foreground">Automações habilitadas no template:</span>
            <Badge variant="secondary">{enabledAutomationsCount}</Badge>
          </div>

          {enabledAutomationsCount === 0 && (
            <p className="text-xs text-muted-foreground">
              Este modelo não tem automações habilitadas. As tarefas do modelo continuam sendo criadas nos spaces
              selecionados.
            </p>
          )}


          {/* Space selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Selecionar Spaces</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleSelectAll}
              >
                {selectedSpaceIds.length === matchingSpaces.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>

            {spacesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : matchingSpaces.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhum space encontrado com o padrão "{template?.name}"
              </div>
            ) : (
              <ScrollArea className="h-[240px] border rounded-md p-2">
                <div className="space-y-1">
                  {matchingSpaces.map(space => (
                    <label
                      key={space.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSpaceIds.includes(space.id)}
                        onCheckedChange={() => handleToggleSpace(space.id)}
                      />
                      <span className="text-sm">{space.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Summary */}
          {selectedSpaceIds.length > 0 && enabledAutomationsCount > 0 && (
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-xs text-center">
                Serão criadas aproximadamente{' '}
                <strong className="text-primary">
                  {selectedSpaceIds.length * enabledAutomationsCount}
                </strong>{' '}
                automações ({selectedSpaceIds.length} spaces × {enabledAutomationsCount} automações)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedSpaceIds.length === 0 || applyAutomations.isPending}
          >
            {applyAutomations.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              'Aplicar Automações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

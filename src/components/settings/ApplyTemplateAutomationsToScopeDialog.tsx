import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationTree } from '@/components/settings/LocationTree';
import { useSpaces } from '@/hooks/useSpaces';
import { useFoldersForWorkspace } from '@/hooks/useFolders';
import { useListsForWorkspace } from '@/hooks/useLists';
import { useSpaceTemplate, useApplyTemplateAutomationsToScopes } from '@/hooks/useSpaceTemplates';
import { useTemplateAutomations } from '@/hooks/useTemplateAutomations';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Zap, Search, Info } from 'lucide-react';

interface ApplyTemplateAutomationsToScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  targetType: 'folder' | 'list';
}

export const ApplyTemplateAutomationsToScopeDialog = ({
  open,
  onOpenChange,
  templateId,
  targetType,
}: ApplyTemplateAutomationsToScopeDialogProps) => {
  const { activeWorkspace } = useWorkspace();
  const { data: template } = useSpaceTemplate(templateId);
  const { data: automations } = useTemplateAutomations(templateId);
  const { data: spaces, isLoading: spacesLoading } = useSpaces(activeWorkspace?.id);
  const { data: folders } = useFoldersForWorkspace(activeWorkspace?.id);
  const { data: lists } = useListsForWorkspace(activeWorkspace?.id);
  const applyAutomations = useApplyTemplateAutomationsToScopes();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createMissing, setCreateMissing] = useState(false);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [expandedSpaces, setExpandedSpaces] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [result, setResult] = useState<{
    targetsProcessed: number;
    automationsCreated: number;
    automationsReplaced: number;
    structuresCreated: number;
    tasksCreated: number;
    errors: string[];
  } | null>(null);

  const isFolder = targetType === 'folder';
  const labelPlural = isFolder ? 'Pastas' : 'Listas';

  const activeSpaces = useMemo(
    () => (spaces || []).filter(s => !('archived_at' in s && s.archived_at)),
    [spaces]
  );
  const activeSpaceIds = useMemo(() => new Set(activeSpaces.map(s => s.id)), [activeSpaces]);
  const visibleFolders = useMemo(
    () => (folders || []).filter(f => !f.space_id || activeSpaceIds.has(f.space_id)),
    [folders, activeSpaceIds]
  );
  const visibleLists = useMemo(
    () => (lists || []).filter(l => !l.space_id || activeSpaceIds.has(l.space_id)),
    [lists, activeSpaceIds]
  );

  const availableTargets = isFolder ? visibleFolders : visibleLists;

  const enabledAutomationsCount = useMemo(
    () => automations?.filter(a => a.enabled).length || 0,
    [automations]
  );

  const toggleExpand = (type: 'space' | 'folder', id: string) => {
    if (type === 'space') {
      setExpandedSpaces(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));
    } else {
      setExpandedFolders(prev => (prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]));
    }
  };

  const toggleSelection = (type: 'space' | 'folder' | 'list', id: string) => {
    if (type === 'space' && createMissing) {
      setSelectedSpaceIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
      return;
    }
    if (type !== targetType) return;
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const expandAll = () => {
    setExpandedSpaces(activeSpaces.map(s => s.id));
    setExpandedFolders(visibleFolders.map(f => f.id));
  };

  const collapseAll = () => {
    setExpandedSpaces([]);
    setExpandedFolders([]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === availableTargets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableTargets.map(t => t.id));
    }
  };

  const handleApply = async () => {
    if (!activeWorkspace || (selectedIds.length === 0 && selectedSpaceIds.length === 0)) return;
    const res = await applyAutomations.mutateAsync({
      templateId,
      workspaceId: activeWorkspace.id,
      targetType,
      targetIds: selectedIds,
      createInSpaceIds: createMissing ? selectedSpaceIds : [],
    });
    setResult(res);
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSelectedSpaceIds([]);
    setSearch('');
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.targetsProcessed}</div>
                <div className="text-xs text-muted-foreground">{labelPlural} processadas</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{result.automationsCreated}</div>
                <div className="text-xs text-muted-foreground">Automações aplicadas</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.automationsReplaced}</div>
                <div className="text-xs text-muted-foreground">Substituídas</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.structuresCreated}</div>
                <div className="text-xs text-muted-foreground">Pastas/listas criadas</div>
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
                  {result.errors.length > 5 && <li>... e mais {result.errors.length - 5} erros</li>}
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
             Aplicar Template em {labelPlural}
          </DialogTitle>
          <DialogDescription>
            Selecione as {labelPlural.toLowerCase()} que receberão as automações do template "{template?.name}".
            Automações equivalentes já existentes no destino serão substituídas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
          <span className="text-xs text-muted-foreground">Automações habilitadas no template:</span>
          <Badge variant="secondary">{enabledAutomationsCount}</Badge>
        </div>

        {enabledAutomationsCount === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Este modelo não tem automações habilitadas. Você ainda pode aplicar: as{' '}
              {labelPlural.toLowerCase()} do modelo que estiverem faltando serão criadas, sem nenhuma automação. Se
              quiser trazer automações, abra a edição do modelo e use <strong>Importar</strong>.
            </AlertDescription>
          </Alert>
        )}

        <label className="flex items-start gap-2 p-2 rounded-md border cursor-pointer">
          <Checkbox
            checked={createMissing}
            onCheckedChange={(checked) => {
              setCreateMissing(!!checked);
              if (!checked) setSelectedSpaceIds([]);
            }}
          />
          <span className="text-xs leading-relaxed">
            Criar {labelPlural.toLowerCase()} do modelo que não existirem — marque os Spaces abaixo. As já
            existentes mantêm suas tarefas e só têm as automações equivalentes substituídas.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar space, pasta ou lista..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={expandAll}>
              Expandir tudo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
              Recolher
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedIds.length === availableTargets.length && availableTargets.length > 0
                ? 'Desmarcar todos'
                : 'Selecionar todos'}
            </Button>
          </div>
        </div>

        {spacesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[45vh] rounded-lg border p-3">
            <LocationTree
              idPrefix={`apply-automations-${targetType}`}
              density="comfortable"
              search={search}
              selectableTypes={createMissing ? ['space', targetType] : [targetType]}
              showWorkspaceOption={false}
              spaces={activeSpaces}
              folders={visibleFolders}
              lists={visibleLists}
              applyToWorkspace={false}
              onToggleWorkspace={() => {}}
              selectedSpaces={selectedSpaceIds}
              selectedFolders={isFolder ? selectedIds : []}
              selectedLists={isFolder ? [] : selectedIds}
              expandedSpaces={expandedSpaces}
              expandedFolders={expandedFolders}
              onToggleExpand={toggleExpand}
              onToggleSelection={toggleSelection}
            />
          </ScrollArea>
        )}

        {createMissing && selectedSpaceIds.length > 0 && (
          <div className="p-2 bg-muted/50 border rounded-md">
            <p className="text-xs text-center">
              {selectedSpaceIds.length} Space(s) receberão as {labelPlural.toLowerCase()} do modelo que estiverem
              faltando, já com as etapas do modelo de status.
            </p>
          </div>
        )}

        {selectedIds.length > 0 && enabledAutomationsCount > 0 && (
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-xs text-center">
              Serão aplicadas aproximadamente{' '}
              <strong className="text-primary">{selectedIds.length * enabledAutomationsCount}</strong>{' '}
              automações ({selectedIds.length} {labelPlural.toLowerCase()} × {enabledAutomationsCount} automações)
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              (selectedIds.length === 0 && selectedSpaceIds.length === 0) ||
              applyAutomations.isPending
            }
          >
            {applyAutomations.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
               'Aplicar Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

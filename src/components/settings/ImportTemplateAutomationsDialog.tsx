import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Info, Search } from 'lucide-react';
import { LocationTree } from './LocationTree';
import { useSpaces } from '@/hooks/useSpaces';
import { useFoldersForWorkspace } from '@/hooks/useFolders';
import { useListsForWorkspace } from '@/hooks/useLists';
import { useSpaceTemplates } from '@/hooks/useSpaceTemplates';
import { useImportTemplateAutomations } from '@/hooks/useImportTemplateAutomations';

interface ImportTemplateAutomationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  workspaceId: string;
  allowedScopes?: Array<'space' | 'folder' | 'list'>;
}

type Selected = { type: 'space' | 'folder' | 'list'; id: string; name: string } | null;

export function ImportTemplateAutomationsDialog({
  open,
  onOpenChange,
  templateId,
  workspaceId,
  allowedScopes,
}: ImportTemplateAutomationsDialogProps) {
  const { data: spaces = [] } = useSpaces(workspaceId);
  const { data: folders = [] } = useFoldersForWorkspace(workspaceId);
  const { data: lists = [] } = useListsForWorkspace(workspaceId);
  const { data: templates = [] } = useSpaceTemplates();
  const importAutomations = useImportTemplateAutomations();

  const [search, setSearch] = useState('');
  const [expandedSpaces, setExpandedSpaces] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<Selected>(null);
  const [sourceTemplateId, setSourceTemplateId] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const activeSpaces = useMemo(
    () => spaces.filter((s: { archived_at?: string | null }) => !s.archived_at),
    [spaces],
  );

  const otherTemplates = useMemo(
    () => templates.filter((t: { id: string }) => t.id !== templateId),
    [templates, templateId],
  );

  const toggleExpand = (type: 'space' | 'folder', id: string) => {
    if (type === 'space') {
      setExpandedSpaces((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else {
      setExpandedFolders((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }
  };

  const nameOf = (type: 'space' | 'folder' | 'list', id: string) => {
    const pool = type === 'space' ? activeSpaces : type === 'folder' ? folders : lists;
    return (pool as { id: string; name: string }[]).find((i) => i.id === id)?.name ?? '';
  };

  const toggleSelection = (type: 'space' | 'folder' | 'list', id: string) => {
    setSelected((prev) => (prev && prev.type === type && prev.id === id ? null : { type, id, name: nameOf(type, id) }));
  };

  const handleImportScope = () => {
    if (!selected) return;
    setWarnings([]);
    importAutomations.mutate(
      {
        templateId,
        allowedScopes,
        source: { kind: 'scope', scopeType: selected.type, scopeId: selected.id, label: selected.name },
      },
      {
        onSuccess: (result) => {
          setWarnings(result.warnings);
          if (result.warnings.length === 0) onOpenChange(false);
        },
      },
    );
  };

  const handleImportTemplate = () => {
    if (!sourceTemplateId) return;
    setWarnings([]);
    importAutomations.mutate(
      { templateId, allowedScopes, source: { kind: 'template', sourceTemplateId, label: '' } },
      {
        onSuccess: (result) => {
          setWarnings(result.warnings);
          if (result.warnings.length === 0) onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Importar automações para o modelo
          </DialogTitle>
          <DialogDescription>
            Traga automações já existentes de um Space, pasta ou lista real, ou de outro modelo. As referências de
            pastas, listas e etapas são convertidas automaticamente pelo nome.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="scope" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="scope" className="flex-1">
              De um Space / pasta / lista
            </TabsTrigger>
            <TabsTrigger value="template" className="flex-1">
              De outro modelo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scope" className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar space, pasta ou lista..."
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[45vh] max-h-[45vh] min-h-[200px] border rounded-lg p-2">
              <LocationTree
                idPrefix="import-automations"
                density="comfortable"
                search={search}
                showWorkspaceOption={false}
                spaces={activeSpaces}
                folders={folders}
                lists={lists}
                applyToWorkspace={false}
                onToggleWorkspace={() => {}}
                selectedSpaces={selected?.type === 'space' ? [selected.id] : []}
                selectedFolders={selected?.type === 'folder' ? [selected.id] : []}
                selectedLists={selected?.type === 'list' ? [selected.id] : []}
                expandedSpaces={expandedSpaces}
                expandedFolders={expandedFolders}
                onToggleExpand={toggleExpand}
                onToggleSelection={toggleSelection}
              />
            </ScrollArea>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImportScope} disabled={!selected || importAutomations.isPending}>
                {importAutomations.isPending ? 'Importando...' : 'Importar automações'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="template" className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="space-y-2">
              <Label>Modelo de origem</Label>
              <Select value={sourceTemplateId} onValueChange={setSourceTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {otherTemplates.map((t: { id: string; name: string }) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImportTemplate} disabled={!sourceTemplateId || importAutomations.isPending}>
                {importAutomations.isPending ? 'Importando...' : 'Importar automações'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>

        {warnings.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Avisos da importação:</p>
              <ul className="list-disc pl-4 space-y-1 text-xs max-h-32 overflow-y-auto">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}

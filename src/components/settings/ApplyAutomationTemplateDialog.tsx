import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Loader2, Search, Zap } from 'lucide-react';
import { useSpaces } from '@/hooks/useSpaces';
import { useFoldersForWorkspace } from '@/hooks/useFolders';
import { useListsForWorkspace } from '@/hooks/useLists';
import { type AutomationTemplateModel, useApplyAutomationTemplate } from '@/hooks/useAutomationTemplates';

export function ApplyAutomationTemplateDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (open: boolean) => void; template: AutomationTemplateModel }) {
  const { data: spaces = [], isLoading: spacesLoading } = useSpaces(template.workspace_id);
  const { data: folders = [], isLoading: foldersLoading } = useFoldersForWorkspace(template.workspace_id);
  const { data: lists = [], isLoading: listsLoading } = useListsForWorkspace(template.workspace_id);
  const applyTemplate = useApplyAutomationTemplate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ targetsProcessed: number; automationsCreated: number; automationsReplaced: number; errors: string[] } | null>(null);

  const targets = useMemo(() => {
    const source = template.target_type === 'space' ? spaces : template.target_type === 'folder' ? folders : lists;
    const normalized = search.trim().toLowerCase();
    return source.filter((item) => !normalized || item.name.toLowerCase().includes(normalized));
  }, [folders, lists, search, spaces, template.target_type]);
  const loading = spacesLoading || foldersLoading || listsLoading;
  const label = template.target_type === 'space' ? 'Spaces' : template.target_type === 'folder' ? 'Pastas' : 'Listas';

  const close = () => { setSelectedIds([]); setSearch(''); setResult(null); onOpenChange(false); };
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Aplicar modelo em {label}</DialogTitle>
          <DialogDescription>Somente as automações de “{template.name}” serão aplicadas. Estrutura e tarefas não serão alteradas.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-primary" />Aplicação concluída</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted p-3"><strong className="block text-2xl">{result.targetsProcessed}</strong><span className="text-xs text-muted-foreground">Destinos</span></div>
              <div className="rounded-lg bg-muted p-3"><strong className="block text-2xl text-primary">{result.automationsCreated}</strong><span className="text-xs text-muted-foreground">Criadas</span></div>
              <div className="rounded-lg bg-muted p-3"><strong className="block text-2xl">{result.automationsReplaced}</strong><span className="text-xs text-muted-foreground">Substituídas</span></div>
            </div>
            {result.errors.length > 0 && <div className="max-h-40 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{result.errors.map((error, index) => <p key={`${error}-${index}`}>• {error}</p>)}</div>}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${label.toLowerCase()}...`} /></div>
              <Button variant="outline" onClick={() => setSelectedIds(selectedIds.length === targets.length ? [] : targets.map((target) => target.id))}>{selectedIds.length === targets.length && targets.length ? 'Desmarcar todos' : 'Selecionar todos'}</Button>
            </div>
            <ScrollArea className="h-[45vh] min-h-[220px] rounded-lg border p-2">
              {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : targets.map((target) => (
                <label key={target.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"><Checkbox checked={selectedIds.includes(target.id)} onCheckedChange={() => toggle(target.id)} /><span className="text-sm">{target.name}</span></label>
              ))}
            </ScrollArea>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>{result ? 'Fechar' : 'Cancelar'}</Button>
          {!result && <Button disabled={!selectedIds.length || applyTemplate.isPending} onClick={async () => setResult(await applyTemplate.mutateAsync({ template, targetIds: selectedIds }))}>{applyTemplate.isPending ? 'Aplicando...' : 'Aplicar automações'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
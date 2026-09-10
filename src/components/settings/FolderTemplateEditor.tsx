import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  useSpaceTemplate, 
  useCreateSpaceTemplate, 
  useUpdateSpaceTemplate 
} from '@/hooks/useSpaceTemplates';
import { useStatusTemplates } from '@/hooks/useStatusTemplates';
import { TemplateTaskDialog } from './TemplateTaskDialog';
import { TemplateAutomationsSection } from './TemplateAutomationsSection';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  ArrowLeft, Plus, List, CheckSquare, X, Loader2,
  ChevronDown, ChevronRight, Flag, Clock, Tag
} from 'lucide-react';
import { useTaskTags } from '@/hooks/useTaskTags';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: '#94a3b8' },
  { value: 'medium', label: 'Média', color: '#f59e0b' },
  { value: 'high', label: 'Alta', color: '#f97316' },
  { value: 'urgent', label: 'Urgente', color: '#ef4444' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DateRecurrenceConfig = Record<string, any>;

interface ListItem {
  tempId: string;
  name: string;
  description: string;
  default_view: string;
  isExpanded: boolean;
  status_template_id: string | null;
}

interface TaskItem {
  tempId: string;
  listTempId: string;
  title: string;
  description: string;
  priority: string;
  startDateOffset: number | null;
  dueDateOffset: number | null;
  startDateRecurrence?: DateRecurrenceConfig | null;
  dueDateRecurrence?: DateRecurrenceConfig | null;
  statusTemplateItemId: string | null;
  estimatedTime: number | null;
  isMilestone: boolean;
  tagNames: string[];
}

interface FolderTemplateEditorProps {
  templateId?: string;
  onClose: () => void;
}

export const FolderTemplateEditor = ({ templateId, onClose }: FolderTemplateEditorProps) => {
  const { activeWorkspace } = useWorkspace();
  const { data: template, isLoading } = useSpaceTemplate(templateId);
  const { data: statusTemplates = [] } = useStatusTemplates(activeWorkspace?.id);
  const { data: workspaceTags = [] } = useTaskTags(activeWorkspace?.id);
  const createTemplate = useCreateSpaceTemplate();
  const updateTemplate = useUpdateSpaceTemplate();

  const { data: allStatusItems = [] } = useQuery({
    queryKey: ['all-status-template-items', statusTemplates.map(st => st.id)],
    queryFn: async () => {
      if (statusTemplates.length === 0) return [];
      const { data, error } = await supabase
        .from('status_template_items')
        .select('*')
        .in('template_id', statusTemplates.map(st => st.id))
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
    enabled: statusTemplates.length > 0,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderName, setFolderName] = useState('Nova Pasta');
  const [folderDescription, setFolderDescription] = useState('');
  const [lists, setLists] = useState<ListItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [pendingListTempId, setPendingListTempId] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');

      // For folder templates, the first folder IS the folder
      const folder = template.folders?.[0];
      if (folder) {
        setFolderName(folder.name);
        setFolderDescription(folder.description || '');
      }

      const listMap: Record<string, string> = {};
      const loadedLists = (template.lists || []).map((l, i) => {
        const tempId = `list-${i}`;
        listMap[l.id] = tempId;
        return {
          tempId,
          name: l.name,
          description: l.description || '',
          default_view: l.default_view,
          isExpanded: true,
          status_template_id: l.status_template_id || null,
        };
      });
      setLists(loadedLists);

      const loadedTasks = (template.tasks || []).map((t, i) => ({
        tempId: `task-${i}`,
        listTempId: listMap[t.list_ref_id],
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        startDateOffset: t.start_date_offset ?? null,
        dueDateOffset: t.due_date_offset ?? null,
        startDateRecurrence: t.start_date_recurrence ?? null,
        dueDateRecurrence: t.due_date_recurrence ?? null,
        statusTemplateItemId: t.status_template_item_id ?? null,
        estimatedTime: t.estimated_time ?? null,
        isMilestone: t.is_milestone ?? false,
        tagNames: t.tag_names ?? [],
      }));
      setTasks(loadedTasks);
    }
  }, [template]);

  const generateTempId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addList = () => {
    setLists([...lists, {
      tempId: generateTempId('list'),
      name: 'Nova Lista',
      description: '',
      default_view: 'list',
      isExpanded: true,
      status_template_id: null,
    }]);
  };

  const removeList = (tempId: string) => {
    setLists(lists.filter(l => l.tempId !== tempId));
    setTasks(tasks.filter(t => t.listTempId !== tempId));
  };

  const toggleListExpand = (tempId: string) => {
    setLists(lists.map(l => l.tempId === tempId ? { ...l, isExpanded: !l.isExpanded } : l));
  };

  const openAddTaskDialog = (listTempId: string) => {
    setPendingListTempId(listTempId);
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const openEditTaskDialog = (task: TaskItem) => {
    setEditingTask(task);
    setPendingListTempId(null);
    setTaskDialogOpen(true);
  };

  const handleTaskSave = (taskData: {
    title: string; description: string; priority: string;
    startDateOffset: number | null; dueDateOffset: number | null;
    startDateRecurrence?: DateRecurrenceConfig | null;
    dueDateRecurrence?: DateRecurrenceConfig | null;
    statusTemplateItemId: string | null; estimatedTime: number | null;
    isMilestone: boolean; tagNames: string[];
  }) => {
    const normalizedData = {
      ...taskData,
      startDateRecurrence: taskData.startDateRecurrence ?? null,
      dueDateRecurrence: taskData.dueDateRecurrence ?? null,
    };

    if (editingTask) {
      setTasks(tasks.map(t => t.tempId === editingTask.tempId ? { ...t, ...normalizedData } : t));
    } else if (pendingListTempId) {
      setTasks([...tasks, { tempId: generateTempId('task'), listTempId: pendingListTempId, ...normalizedData }]);
    }
  };

  const removeTask = (tempId: string) => {
    setTasks(tasks.filter(t => t.tempId !== tempId));
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const listIndexMap: Record<string, number> = {};
    lists.forEach((l, i) => { listIndexMap[l.tempId] = i; });

    const foldersData = [{ name: folderName, description: folderDescription || null, order_index: 0 }];
    const listsData = lists.map((l, i) => ({
      folderRefIndex: 0,
      name: l.name,
      description: l.description || null,
      default_view: l.default_view,
      order_index: i,
      status_template_id: l.status_template_id || null,
    }));

    const tasksData = tasks.map((t, i) => ({
      listRefIndex: listIndexMap[t.listTempId],
      title: t.title,
      description: t.description || null,
      priority: t.priority,
      order_index: i,
      start_date_offset: t.startDateOffset,
      due_date_offset: t.dueDateOffset,
      start_date_recurrence: t.startDateRecurrence || null,
      due_date_recurrence: t.dueDateRecurrence || null,
      status_template_item_id: t.statusTemplateItemId,
      estimated_time: t.estimatedTime,
      is_milestone: t.isMilestone,
      tag_names: t.tagNames.length > 0 ? t.tagNames : null,
    }));

    if (templateId) {
      await updateTemplate.mutateAsync({
        id: templateId, name, description: description || null, color: null,
        folders: foldersData, lists: listsData, tasks: tasksData,
      });
    } else {
      await createTemplate.mutateAsync({
        name, description: description || undefined, type: 'folder',
        folders: foldersData, lists: listsData, tasks: tasksData,
      });
    }
    onClose();
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  if (isLoading && templateId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getTasksForList = (listTempId: string) => tasks.filter(t => t.listTempId === listTempId);

  const renderTask = (task: TaskItem) => {
    const priorityOption = PRIORITY_OPTIONS.find(p => p.value === task.priority);
    return (
      <div key={task.tempId} className="flex items-center gap-2 pl-10 py-1.5 cursor-pointer hover:bg-muted/50 rounded group" onClick={() => openEditTaskDialog(task)}>
        <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm flex-1 truncate">{task.title}</span>
        {task.isMilestone && <Flag className="h-3 w-3 text-amber-500 flex-shrink-0" />}
        {task.dueDateOffset !== null && <Badge variant="outline" className="text-xs">+{task.dueDateOffset}d</Badge>}
        {task.estimatedTime !== null && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {Math.floor(task.estimatedTime / 60)}h{task.estimatedTime % 60 > 0 ? `${task.estimatedTime % 60}m` : ''}
          </span>
        )}
        {task.tagNames.length > 0 && <Badge variant="secondary" className="text-xs flex items-center gap-0.5"><Tag className="h-3 w-3" />{task.tagNames.length}</Badge>}
        <Badge variant="outline" className="text-xs">
          <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: priorityOption?.color }} />
          {priorityOption?.label}
        </Badge>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); removeTask(task.tempId); }}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  const renderList = (list: ListItem) => {
    const listTasks = getTasksForList(list.tempId);
    const selectedTemplate = statusTemplates.find(st => st.id === list.status_template_id);

    return (
      <div key={list.tempId} className="border-l-2 border-muted ml-4">
        <div className="flex items-center gap-2 pl-4 py-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleListExpand(list.tempId)}>
            {list.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <List className="h-4 w-4 text-muted-foreground" />
          <Input
            value={list.name}
            onChange={(e) => setLists(lists.map(l => l.tempId === list.tempId ? { ...l, name: e.target.value } : l))}
            className="h-8 text-sm flex-1"
            placeholder="Nome da lista"
          />
          <Select value={list.status_template_id || 'inherit'} onValueChange={(value) => setLists(lists.map(l => l.tempId === list.tempId ? { ...l, status_template_id: value === 'inherit' ? null : value } : l))}>
            <SelectTrigger className="w-44 h-8">
              <SelectValue>
                {list.status_template_id ? selectedTemplate?.name || 'Template' : <span className="text-muted-foreground">Herdar Workspace</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit"><span className="text-muted-foreground">Herdar Workspace</span></SelectItem>
              {statusTemplates.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeList(list.tempId)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {list.isExpanded && (
          <div className="ml-4 space-y-1">
            {listTasks.map(renderTask)}
            <Button variant="ghost" size="sm" className="ml-10 text-muted-foreground" onClick={() => openAddTaskDialog(list.tempId)}>
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Tarefa
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {templateId ? 'Editar Template de Pasta' : 'Criar Template de Pasta'}
        </h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Informações do Template</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Template</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pasta de Conteúdo" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o propósito deste template" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Estrutura da Pasta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Pasta</label>
            <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Nome da pasta" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição da Pasta (opcional)</label>
            <Textarea value={folderDescription} onChange={(e) => setFolderDescription(e.target.value)} placeholder="Descrição da pasta" rows={2} />
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Listas</h4>
              <Button variant="outline" size="sm" onClick={addList}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Lista
              </Button>
            </div>
            <div className="space-y-1">
              {lists.map(renderList)}
              {lists.length === 0 && (
                <div className="text-center py-4 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">Adicione listas para esta pasta</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {templateId && activeWorkspace && (
        <TemplateAutomationsSection
          templateId={templateId}
          folders={template?.folders || []}
          lists={template?.lists || []}
          workspaceId={activeWorkspace.id}
          allowedScopes={['folder', 'list']}
          description="Estas automações serão criadas automaticamente quando uma pasta for criada a partir deste template, e podem ser aplicadas em pastas já existentes."
        />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!name.trim() || !folderName.trim() || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {templateId ? 'Salvar Alterações' : 'Criar Template'}
        </Button>
      </div>

      <TemplateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        onSave={handleTaskSave}
        statusTemplateItems={(() => {
          const targetListTempId = editingTask?.listTempId || pendingListTempId;
          if (!targetListTempId) return [];
          const targetList = lists.find(l => l.tempId === targetListTempId);
          if (!targetList?.status_template_id) return [];
          return allStatusItems.filter(item => item.template_id === targetList.status_template_id);
        })()}
        availableTags={workspaceTags}
      />
    </div>
  );
};

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
  ArrowLeft, Plus, CheckSquare, X, Loader2, Flag, Clock, Tag
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

interface ListTemplateEditorProps {
  templateId?: string;
  onClose: () => void;
}

export const ListTemplateEditor = ({ templateId, onClose }: ListTemplateEditorProps) => {
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
  const [listName, setListName] = useState('Nova Lista');
  const [listDescription, setListDescription] = useState('');
  const [defaultView, setDefaultView] = useState('list');
  const [statusTemplateId, setStatusTemplateId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const LIST_TEMP_ID = 'list-root';

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');

      const list = template.lists?.[0];
      if (list) {
        setListName(list.name);
        setListDescription(list.description || '');
        setDefaultView(list.default_view || 'list');
        setStatusTemplateId(list.status_template_id || null);
      }

      const loadedTasks = (template.tasks || []).map((t, i) => ({
        tempId: `task-${i}`,
        listTempId: LIST_TEMP_ID,
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

  const openAddTaskDialog = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const openEditTaskDialog = (task: TaskItem) => {
    setEditingTask(task);
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
    } else {
      setTasks([...tasks, { tempId: generateTempId('task'), listTempId: LIST_TEMP_ID, ...normalizedData }]);
    }
  };

  const removeTask = (tempId: string) => {
    setTasks(tasks.filter(t => t.tempId !== tempId));
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const listsData = [{
      name: listName,
      description: listDescription || null,
      default_view: defaultView,
      order_index: 0,
      status_template_id: statusTemplateId || null,
    }];

    const tasksData = tasks.map((t, i) => ({
      listRefIndex: 0,
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
        folders: [], lists: listsData, tasks: tasksData,
      });
    } else {
      await createTemplate.mutateAsync({
        name, description: description || undefined, type: 'list',
        folders: [], lists: listsData, tasks: tasksData,
      });
    }
    onClose();
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const selectedStatusTemplate = statusTemplates.find(st => st.id === statusTemplateId);

  if (isLoading && templateId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderTask = (task: TaskItem) => {
    const priorityOption = PRIORITY_OPTIONS.find(p => p.value === task.priority);
    return (
      <div key={task.tempId} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded group" onClick={() => openEditTaskDialog(task)}>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {templateId ? 'Editar Template de Lista' : 'Criar Template de Lista'}
        </h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Informações do Template</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Template</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lista de Tarefas Padrão" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o propósito deste template" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Configuração da Lista</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Lista</label>
            <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Nome da lista" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição da Lista (opcional)</label>
            <Textarea value={listDescription} onChange={(e) => setListDescription(e.target.value)} placeholder="Descrição da lista" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">View padrão</label>
              <Select value={defaultView} onValueChange={setDefaultView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Lista</SelectItem>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="sprint">Sprint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo de Status</label>
              <Select value={statusTemplateId || 'inherit'} onValueChange={(v) => setStatusTemplateId(v === 'inherit' ? null : v)}>
                <SelectTrigger>
                  <SelectValue>
                    {statusTemplateId ? selectedStatusTemplate?.name || 'Template' : <span className="text-muted-foreground">Herdar Workspace</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit"><span className="text-muted-foreground">Herdar Workspace</span></SelectItem>
                  {statusTemplates.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tarefas</CardTitle>
            <Button variant="outline" size="sm" onClick={openAddTaskDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Tarefa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-4 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">Adicione tarefas para esta lista</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map(renderTask)}
            </div>
          )}
        </CardContent>
      </Card>

      {templateId && activeWorkspace && (
        <TemplateAutomationsSection
          templateId={templateId}
          folders={template?.folders || []}
          lists={template?.lists || []}
          workspaceId={activeWorkspace.id}
          allowedScopes={['list']}
          description="Estas automações serão criadas automaticamente quando uma lista for criada a partir deste template, e podem ser aplicadas em listas já existentes."
        />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!name.trim() || !listName.trim() || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {templateId ? 'Salvar Alterações' : 'Criar Template'}
        </Button>
      </div>

      <TemplateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        onSave={handleTaskSave}
        statusTemplateItems={statusTemplateId ? allStatusItems.filter(item => item.template_id === statusTemplateId) : []}
        availableTags={workspaceTags}
      />
    </div>
  );
};

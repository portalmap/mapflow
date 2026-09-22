import { useState } from 'react';
import { useParams, useNavigate } from "@/lib/router-compat";
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpace, useUpdateSpace } from '@/hooks/useSpaces';
import { useFolders, useCreateFolder } from '@/hooks/useFolders';
import { useLists, useCreateList } from '@/hooks/useLists';
import { useTaskStats } from '@/hooks/useTaskStats';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Plus, FolderOpen, List, ChevronRight, ChevronDown, Pencil, FileText, UserCheck, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskStatsDashboard from '@/components/dashboard/TaskStatsDashboard';
import QuickAutomationButtons from '@/components/automations/QuickAutomationButtons';
import ScopeProductivityCard from '@/components/dashboard/ScopeProductivityCard';

const SpaceDetailView = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentSpace, isLoading: spaceLoading } = useSpace(spaceId);
  const { data: folders, isLoading: foldersLoading } = useFolders(spaceId);
  const { data: lists, isLoading: listsLoading } = useLists({ spaceId });
  const { data: taskStats, isLoading: statsLoading } = useTaskStats({ type: 'space', id: spaceId });
  const { data: members = [] } = useWorkspaceMembers(activeWorkspace?.id);
  const { data: userRole } = useUserRole();
  const canEditResponsaveis = userRole?.isAdmin ?? false;
  
  const createFolder = useCreateFolder();
  const createList = useCreateList();
  const updateSpace = useUpdateSpace();

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [responsaveisOpen, setResponsaveisOpen] = useState(false);

  const handleCreateFolder = async () => {
    if (!spaceId || !newFolderName.trim()) return;

    await createFolder.mutateAsync({
      spaceId,
      name: newFolderName,
      description: newFolderDescription,
    });

    setNewFolderName('');
    setNewFolderDescription('');
    setIsFolderDialogOpen(false);
  };

  const handleSaveDescription = async () => {
    if (!spaceId) return;
    setSavingDescription(true);
    const { error } = await supabase
      .from('spaces')
      .update({ description: editedDescription || null })
      .eq('id', spaceId);
    setSavingDescription(false);
    if (error) {
      toast.error('Erro ao salvar descrição');
      return;
    }
    toast.success('Descrição atualizada!');
    setIsEditingDescription(false);
    queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
  };

  const handleCreateList = async () => {
    if (!currentSpace || !spaceId || !newListName.trim()) return;

    await createList.mutateAsync({
      workspaceId: currentSpace.workspace_id,
      spaceId,
      name: newListName,
      description: newListDescription,
    });

    setNewListName('');
    setNewListDescription('');
    setIsListDialogOpen(false);
  };

  if (!activeWorkspace || !currentSpace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-3 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/')}>
              {activeWorkspace.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{currentSpace.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: currentSpace.color || '#94a3b8' }}
            />
            {currentSpace.name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <QuickAutomationButtons
            workspaceId={activeWorkspace.id}
            scopeType="space"
            scopeId={spaceId!}
            scopeName={currentSpace.name}
          />
        </div>
      </div>

      {/* Área descritiva do Space */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Descrição do Space
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditingDescription ? (
            <div className="space-y-3">
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Descreva o propósito, objetivos e informações importantes deste space..."
                className="min-h-[120px]"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsEditingDescription(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
                  {savingDescription && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="cursor-pointer group min-h-[48px] flex items-start gap-2"
              onClick={() => {
                setEditedDescription(currentSpace.description || '');
                setIsEditingDescription(true);
              }}
            >
              {currentSpace.description ? (
                <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{currentSpace.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic flex-1">Clique para adicionar uma descrição...</p>
              )}
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsáveis do Space */}
      <Collapsible open={responsaveisOpen} onOpenChange={setResponsaveisOpen}>
        <Card className="bg-muted border-0 shadow-none">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-accent/40 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Responsáveis
                  </CardTitle>
                  <CardDescription>
                    Responsáveis gerais pelas tarefas deste space
                  </CardDescription>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    responsaveisOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  {
                    key: 'account' as const,
                    label: 'Account',
                    hint: 'Responsável geral por todas as tarefas deste space',
                    value: currentSpace.account_user_id,
                  },
                  {
                    key: 'headProjetos' as const,
                    label: 'Head de Projetos',
                    hint: 'Produtividade calculada pela média da equipe deste space',
                    value: (currentSpace as any).head_projetos_user_id,
                  },
                  {
                    key: 'headAccount' as const,
                    label: 'Head de Account',
                    hint: 'Produtividade calculada pela média dos Accounts dos spaces',
                    value: (currentSpace as any).head_account_user_id,
                  },
                ]).map((field) => (
                  <div key={field.key} className="space-y-1.5 min-w-0">
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">{field.hint}</p>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => {
                        const userId = value === 'none' ? null : value;
                        updateSpace.mutate({
                          id: currentSpace.id,
                          name: currentSpace.name,
                          ...(field.key === 'account' ? { accountUserId: userId } : {}),
                          ...(field.key === 'headProjetos' ? { headProjetosUserId: userId } : {}),
                          ...(field.key === 'headAccount' ? { headAccountUserId: userId } : {}),
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Selecione o ${field.label}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5 shrink-0">
                                <AvatarImage src={member.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{member.profile?.full_name || 'Sem nome'}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>


      <TaskStatsDashboard stats={taskStats} isLoading={statsLoading} />

      <ScopeProductivityCard scope="space" spaceId={spaceId} />

      <Tabs defaultValue="folders" className="w-full">
        <TabsList>
          <TabsTrigger value="folders">
            <FolderOpen className="mr-2 h-4 w-4" />
            Pastas
          </TabsTrigger>
          <TabsTrigger value="lists">
            <List className="mr-2 h-4 w-4" />
            Listas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsFolderDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pasta
            </Button>
          </div>

          {foldersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : folders && folders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma pasta ainda</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie pastas para organizar suas listas
                </p>
                <Button onClick={() => setIsFolderDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pasta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders?.map((folder) => (
                <Card 
                  key={folder.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/folder/${folder.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      {folder.name}
                    </CardTitle>
                    {folder.description && (
                      <CardDescription>{folder.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsListDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Lista
            </Button>
          </div>

          {listsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : lists && lists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <List className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma lista ainda</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie listas diretamente no space ou dentro de pastas
                </p>
                <Button onClick={() => setIsListDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Lista
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists?.map((list) => (
                <Card 
                  key={list.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/list/${list.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-5 w-5" />
                      {list.name}
                    </CardTitle>
                    {list.description && (
                      <CardDescription>{list.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para criar pasta */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Pasta</DialogTitle>
            <DialogDescription>
              Organize suas listas em pastas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nome</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Design, Desenvolvimento, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-description">Descrição (opcional)</Label>
              <Textarea
                id="folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Descreva o propósito desta pasta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar lista */}
      <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Lista</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <span>{activeWorkspace?.name}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium">{currentSpace?.name}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Nome</Label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Sprint 1, Backlog, Tarefas Urgentes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-description">Descrição (opcional)</Label>
              <Textarea
                id="list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Descreva o propósito desta lista"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsListDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateList} 
              disabled={!newListName.trim() || createList.isPending}
            >
              {createList.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpaceDetailView;

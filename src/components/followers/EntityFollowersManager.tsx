import { useState } from 'react';
import { Eye, Plus, X, Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useSpaceFollowers, useAddSpaceFollower, useRemoveSpaceFollower } from '@/hooks/useSpaceFollowers';
import { useFolderFollowers, useAddFolderFollower, useRemoveFolderFollower } from '@/hooks/useFolderFollowers';
import { useListFollowers, useAddListFollower, useRemoveListFollower } from '@/hooks/useListFollowers';
import { useTaskFollowers, useAddTaskFollower, useRemoveTaskFollower } from '@/hooks/useTaskFollowers';
import { useUserRole } from '@/hooks/useUserRole';
import { useSpace } from '@/hooks/useSpaces';

type EntityType = 'space' | 'folder' | 'list' | 'task';

interface EntityFollowersManagerProps {
  entityType: EntityType;
  entityId: string;
  workspaceId: string;
  compact?: boolean;
}

const entityLabels: Record<EntityType, string> = {
  space: 'Space',
  folder: 'Pasta',
  list: 'Lista',
  task: 'Tarefa',
};

const sourceLabels: Record<string, string> = {
  space_follower: 'Space',
  folder_follower: 'Pasta',
  list_follower: 'Lista',
  manual: 'Manual',
};

function useFollowersForEntity(entityType: EntityType, entityId?: string) {
  const space = useSpaceFollowers(entityType === 'space' ? entityId : undefined);
  const folder = useFolderFollowers(entityType === 'folder' ? entityId : undefined);
  const list = useListFollowers(entityType === 'list' ? entityId : undefined);
  const task = useTaskFollowers(entityType === 'task' ? entityId : undefined);

  switch (entityType) {
    case 'space': return space;
    case 'folder': return folder;
    case 'list': return list;
    case 'task': return task;
  }
}

export const EntityFollowersManager = ({ entityType, entityId, workspaceId, compact }: EntityFollowersManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: followers, isLoading } = useFollowersForEntity(entityType, entityId);
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembers(workspaceId);
  const { data: userRole } = useUserRole();
  const isAdmin = userRole?.isAdmin ?? false;
  const { data: spaceData } = useSpace(entityType === 'space' ? entityId : undefined);
  const accountUserId = (spaceData as any)?.account_user_id as string | undefined;

  const addSpace = useAddSpaceFollower();
  const removeSpace = useRemoveSpaceFollower();
  const addFolder = useAddFolderFollower();
  const removeFolder = useRemoveFolderFollower();
  const addList = useAddListFollower();
  const removeList = useRemoveListFollower();
  const addTask = useAddTaskFollower();
  const removeTask = useRemoveTaskFollower();

  const followerIds = followers?.map((f: any) => f.user_id) || [];

  const availableMembers = members?.filter(
    (member) =>
      !followerIds.includes(member.user_id) &&
      (member.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || !search)
  );

  const handleAdd = async (userId: string) => {
    try {
      switch (entityType) {
        case 'space': await addSpace.mutateAsync({ spaceId: entityId, userId }); break;
        case 'folder': await addFolder.mutateAsync({ folderId: entityId, userId }); break;
        case 'list': await addList.mutateAsync({ listId: entityId, userId }); break;
        case 'task': await addTask.mutateAsync({ taskId: entityId, userId }); break;
      }
      setIsOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Erro ao adicionar seguidor:', error);
    }
  };

  const handleRemove = async (follower: any) => {
    // For task followers, don't allow removing inherited ones
    if (entityType === 'task' && follower.source_type && follower.source_type !== 'manual') {
      return;
    }
    try {
      switch (entityType) {
        case 'space': await removeSpace.mutateAsync({ spaceId: entityId, userId: follower.user_id }); break;
        case 'folder': await removeFolder.mutateAsync({ folderId: entityId, userId: follower.user_id }); break;
        case 'list': await removeList.mutateAsync({ listId: entityId, userId: follower.user_id }); break;
        case 'task': await removeTask.mutateAsync({ taskId: entityId, userId: follower.user_id }); break;
      }
    } catch (error) {
      console.error('Erro ao remover seguidor:', error);
    }
  };

  const isPending = addSpace.isPending || addFolder.isPending || addList.isPending || addTask.isPending;
  const isRemoving = removeSpace.isPending || removeFolder.isPending || removeList.isPending || removeTask.isPending;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Eye className="h-4 w-4" /> Seguidores {entityType !== 'task' && `do ${entityLabels[entityType]}`}
      </label>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 p-2 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-sm">Carregando...</span>
          </div>
        ) : followers && followers.length > 0 ? (
          <div className="space-y-2">
            {followers.map((follower: any) => {
              const isInherited = entityType === 'task' && follower.source_type && follower.source_type !== 'manual';
              const isAccount = entityType === 'space' && accountUserId === follower.user_id;
              const canRemove = isAdmin && !isInherited && !isAccount;
              return (
                <div
                  key={follower.id}
                  className="flex items-center justify-between p-2 border rounded-md group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={follower.user?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(follower.user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{follower.user?.full_name || 'Sem nome'}</span>
                    {isInherited && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {sourceLabels[follower.source_type] || follower.source_type}
                      </Badge>
                    )}
                    {isAccount && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        Account do Space
                      </Badge>
                    )}
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => handleRemove(follower)}
                      disabled={isRemoving}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 border rounded-md text-muted-foreground text-sm">
            <Eye className="h-4 w-4" />
            Nenhum seguidor
          </div>
        )}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar seguidor
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar membro..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
            <ScrollArea className="h-[200px] overflow-y-auto">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : availableMembers && availableMembers.length > 0 ? (
                <div className="p-1">
                  {availableMembers.map((member) => (
                    <button
                      key={member.id}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left"
                      onClick={() => handleAdd(member.user_id)}
                      disabled={isPending}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{member.profile?.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                      </div>
                      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                  <Check className="h-5 w-5 mb-1" />
                  <p className="text-sm">
                    {search ? 'Nenhum membro encontrado' : 'Todos os membros já são seguidores'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

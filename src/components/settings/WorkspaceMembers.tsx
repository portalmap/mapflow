import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AddWorkspaceMemberDialog } from "./AddWorkspaceMemberDialog";

type WorkspaceRole = "owner" | "admin" | "member" | "limited_member" | "guest";

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  limited_member: "Membro Limitado",
  guest: "Convidado",
};

const roleBadgeVariants: Record<WorkspaceRole, "default" | "secondary" | "destructive" | "outline"> = {
  owner: "destructive",
  admin: "default",
  member: "secondary",
  limited_member: "outline",
  guest: "outline",
};

export function WorkspaceMembers() {
  const { data: workspaces } = useWorkspaces();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const currentWorkspace = workspaces?.[0];

  const { data: isGlobalOwner } = useQuery({
    queryKey: ['is-global-owner', currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data } = await supabase.rpc('is_global_owner', { _user_id: currentUser!.id });
      return !!data;
    },
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover membro');
      console.error(error);
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: role as any })
        .eq('id', memberId);

      if (error) {
        // Verificar se é erro de proteção do owner
        if (error.message?.includes('proprietário')) {
          throw new Error(error.message);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast.success('Permissão atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar permissão');
      console.error(error);
    },
  });

  if (!currentWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Membros do Workspace</CardTitle>
          <CardDescription>Nenhum workspace encontrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentUserMember = members?.find(m => m.user_id === currentUser?.id);
  const isAdmin = currentUserMember?.role === 'admin' || isGlobalOwner === true;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Membros do Workspace</CardTitle>
          <CardDescription>
            Gerencie os membros e suas permissões. Quem tiver o acesso liberado começa a usar na hora.
          </CardDescription>
        </div>
        {isAdmin && <AddWorkspaceMemberDialog workspaceId={currentWorkspace.id} />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando membros...</div>
        ) : !members || members.length === 0 ? (
          <div className="text-muted-foreground">Nenhum membro encontrado</div>
        ) : (
          <div className="w-full overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID do Usuário</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Data de Entrada</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isCurrentUser = member.user_id === currentUser?.id;
                
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">
                      {member.user_id.slice(0, 8)}...
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2">Você</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin && !isCurrentUser ? (
                        <Select
                          value={member.role} 
                          onValueChange={(value) => 
                            updateMemberRole.mutate({ 
                              memberId: member.id, 
                              role: value as WorkspaceRole 
                            })
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="member">Membro</SelectItem>
                            <SelectItem value="limited_member">Membro Limitado</SelectItem>
                            <SelectItem value="guest">Convidado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleBadgeVariants[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(member.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember.mutate(member.id)}
                            disabled={removeMember.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></div>
        )}
      </CardContent>
    </Card>
  );
}

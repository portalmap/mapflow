import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Role = "admin" | "member" | "limited_member" | "guest";

/** Libera acesso direto a um workspace: sem convite, sem e-mail, sem link. */
export function AddWorkspaceMemberDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("member");
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["workspace-available-users", workspaceId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_users_available_for_workspace" as never, {
        _workspace_id: workspaceId,
      } as never);
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
    },
  });

  const term = search.trim().toLowerCase();
  const filtered = (users ?? []).filter(
    (u) => !term || `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(term),
  );

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: userId, role: role as never });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-available-users", workspaceId] });
      toast.success("Acesso liberado!");
      setOpen(false);
      setUserId("");
      setSearch("");
      setRole("member");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao liberar acesso"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Liberar acesso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Liberar acesso ao workspace</DialogTitle>
          <DialogDescription>
            A pessoa passa a usar o workspace na hora, sem e-mail ou link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Buscar por nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Carregando..." : "Escolha a pessoa"} />
            </SelectTrigger>
            <SelectContent>
              {filtered.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Ninguém disponível</div>
              ) : (
                filtered.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email} {u.full_name && u.email ? `(${u.email})` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="limited_member">Membro Limitado</SelectItem>
              <SelectItem value="guest">Convidado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={() => add.mutate()} disabled={!userId || add.isPending}>
            {add.isPending ? "Liberando..." : "Liberar acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

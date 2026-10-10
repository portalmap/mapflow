# Padrões — Telas administrativas do MAP Flow

Documento de referência para planejar novas telas administrativas seguindo os padrões já existentes neste projeto. Reflete o estado atual do código; nada aqui é sugestão de melhoria.

---

## 1. Proteção de rota

A proteção é feita em **três camadas empilhadas**, todas no lado do cliente (o layout `_authenticated` roda com `ssr: false`):

1. **Autenticação** — `src/routes/_authenticated/route.tsx` engloba tudo em `<ProtectedRoute>`, que redireciona para `/sso/login` quando não há sessão.
2. **Workspace obrigatório** — `<WorkspaceRequiredGuard>` no mesmo layout garante que exista um workspace ativo (admins globais podem passar sem workspace).
3. **Papel/role** — `<AdminRoute>` envolve a página quando ela deve ser restrita a admins.

### Papéis existentes

Papéis são lidos de **duas tabelas** via hook `useUserRole` (`src/hooks/useUserRole.ts`):

- **Globais** — tabela `user_roles`, coluna `role`: `global_owner`, `owner`, `admin`.
- **Por workspace** — tabela `workspace_members`, coluna `role` (enum `workspace_role`): `admin`, `member`, `limited_member`, `guest`.

Existe ainda um papel vindo do Hub SSO, armazenado em `profiles.role_slug` e exposto pelo hook `useAppRole` (`src/hooks/useAppRole.ts`) — valores: `administrador_global`, `administrador`, `gestor`, `membro`, `convidado`. Esse é usado somente para leitura do papel Hub; a autorização das telas usa `useUserRole`.

### Guard `<AdminRoute>`

`src/components/AdminRoute.tsx`:

```tsx
export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { data: userRole, isLoading } = useUserRole();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!userRole?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
```

`useUserRole` retorna `isAdmin: true` para (a) qualquer papel global (`global_owner`, `owner`, `admin`) ou (b) `workspace_members.role = 'admin'` no workspace ativo.

### Exemplo de rota protegida existente

`src/routes/_authenticated/settings.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/page-views/Settings";
import { AdminRoute } from "@/components/AdminRoute";

function RouteComponent() {
  return <AdminRoute><Settings /></AdminRoute>;
}

export const Route = createFileRoute("/_authenticated/settings")({
  component: RouteComponent,
});
```

Mesmo padrão em `archived-spaces.tsx` e `automations.tsx`.

---

## 2. Telas administrativas existentes

| Rota | Arquivo de rota | Page-view | Restrição |
|------|-----------------|-----------|-----------|
| `/settings` | `src/routes/_authenticated/settings.tsx` | `src/page-views/Settings.tsx` | `<AdminRoute>` |
| `/archived-spaces` | `src/routes/_authenticated/archived-spaces.tsx` | `src/page-views/ArchivedSpaces.tsx` | `<AdminRoute>` |
| `/automations` | `src/routes/_authenticated/automations.tsx` | `src/page-views/Automations.tsx` | `<AdminRoute>` |

A tela `Settings` concentra a maior parte da administração via `Tabs` (shadcn): Perfil, Workspace, Status, Etiquetas, Templates, Automações, Produtividade, Usuários, Notificações, Webhooks, API. Cada aba é um componente em `src/components/settings/` (ex.: `UserManagement`, `WorkspaceSettings`, `TagsSettings`).

### Layout/shell

Definido em `src/routes/_authenticated/route.tsx` — envolve **todas** as páginas autenticadas com:

```tsx
<SidebarProvider>
  <NotificationListener />
  <div className="flex flex-col h-screen w-full overflow-hidden">
    <MobileHeader />
    <div className="flex flex-1 overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  </div>
</SidebarProvider>
```

- **Sidebar**: `src/components/AppSidebar.tsx` (shadcn sidebar).
- **Header mobile**: `src/components/MobileHeader.tsx`.
- **Breadcrumb global**: não existe. Páginas usam apenas título + descrição no topo do container (ver `Settings.tsx`: `<h1>` + `<p className="text-muted-foreground">`).

### Cabeçalho padrão de página

```tsx
<div className="container mx-auto p-6 space-y-6">
  <div>
    <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
    <p className="text-muted-foreground mt-2">
      Gerencie suas preferências, workspace e membros da equipe
    </p>
  </div>
  {/* conteúdo */}
</div>
```

### Como registrar uma nova rota admin

1. Criar `src/routes/_authenticated/<nome>.tsx` seguindo o exemplo de `settings.tsx` acima (envolver com `<AdminRoute>`).
2. Criar o page-view em `src/page-views/<Nome>.tsx`.
3. O `routeTree.gen.ts` é regenerado automaticamente pelo plugin do TanStack Router — **não editar manualmente**.
4. Adicionar item de navegação, se aplicável, em `src/components/AppSidebar.tsx`.

---

## 3. Leitura de dados do servidor (server-only)

**Este é o padrão mais importante.** O projeto **não usa `createServerFn` do TanStack** para operações administrativas. Todas as operações que exigem `service_role` (bypass de RLS, acesso ao `auth.admin`, chamadas privilegiadas) são feitas via **Supabase Edge Functions**.

Arquivos como `src/integrations/supabase/client.server.ts` e `src/integrations/supabase/auth-middleware.ts` existem no projeto (gerados pela integração) mas **não são utilizados** pela camada administrativa atual.

### Padrão: Edge Function + `supabase.functions.invoke`

**Servidor** — `supabase/functions/get-user-emails/index.ts`:

```ts
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { userIds } = await req.json();
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  const filteredUsers = users
    .filter(u => userIds.includes(u.id))
    .map(u => ({ id: u.id, email: u.email }));

  return new Response(JSON.stringify({ users: filteredUsers }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

**Consumidor no front** — `src/components/settings/UserManagement.tsx` dentro de uma `useQuery`:

```tsx
const { data: emailData, error: emailError } = await supabase.functions.invoke(
  "get-user-emails",
  { body: { userIds } }
);
```

`supabase.functions.invoke` já anexa automaticamente o header `Authorization: Bearer <access_token>` do usuário logado — a edge function pode validar esse JWT quando precisar autorizar por papel.

### Outras edge functions admin existentes

Localizadas em `supabase/functions/`:

- `get-user-emails` — lista emails via `auth.admin.listUsers`.
- (removido) convites por e-mail — o acesso é liberado direto na tela de Membros do workspace.
- `reset-user-password` — reseta senha.
- `update-user-email` — atualiza email de usuário.
- `migrate-helper` — utilitários de migração.
- Fluxo SSO/segurança: `sso-exchange`, `session-guard`, `report-refresh-reuse`, `hub-inbox`, `relay-test-send`.
- Integração externa: `api-gateway`, `api-tasks`, `webhook-enqueue`, `webhooks-dispatcher`, `webhooks-inbound`, `transcribe-audio`.

### Registrando uma nova edge function

1. Criar `supabase/functions/<nome>/index.ts` seguindo o template acima (CORS, `service_role`, `serve`).
2. Registrar em `supabase/config.toml` com `verify_jwt` conforme a necessidade (a maioria mantém verificação de JWT ativa; funções públicas como `hub-inbox` usam `verify_jwt = false` + token próprio).
3. Autorização por papel dentro da função: validar o `Authorization` header e consultar `user_roles` / RPC `has_role`.

### Padrão de chamada no front

Sempre dentro de um hook `useQuery` / `useMutation` do `@tanstack/react-query`. Não há wrapper HTTP nem `fetch` direto — o cliente é sempre `supabase.functions.invoke` (ou `supabase.from(...)` para leituras respeitando RLS).

---

## 4. Componentes de UI

### Biblioteca

**shadcn/ui**, estilo `new-york`, com base slate. Configuração em `components.json`:

```json
{
  "style": "new-york",
  "tailwind": { "css": "src/styles.css", "baseColor": "slate", "cssVariables": true },
  "iconLibrary": "lucide"
}
```

Complementos: `lucide-react` (ícones), `sonner` (toast), `@tanstack/react-query` (estado servidor), `date-fns` (datas). Componentes em `src/components/ui/`: `alert-dialog`, `card`, `dialog`, `hover-card`, `skeleton`, `table`, `toast`, `toaster`, `tabs`, `sidebar`, etc.

### Tabelas/listagens

Não há um `DataTable` genérico. Cada tela monta sua própria listagem. Padrões observados:

- `src/components/settings/UserManagement.tsx` — **listagem em cards** (`<UserCard>`) com filtros (`<UserFilters>`) e mutações via `useMutation`. É o padrão mais próximo a uma "tela admin" cheia.
- `src/components/dashboards/DashboardsTable.tsx` — usa o `<Table>` de shadcn (`src/components/ui/table.tsx`) para linhas tabulares.
- `src/components/documents/DocsHub/DocsHubTable.tsx` — outra variante com `<Table>` shadcn.

### Estados de UI

- **Carregando**: `Loader2` de `lucide-react` com `animate-spin`, geralmente centralizado. Exemplo em `AdminRoute` acima. Para conteúdo dentro de card, usa-se `<Skeleton>` de `src/components/ui/skeleton.tsx`.
- **Erro**: `toast.error("mensagem")` de `sonner`. Erros de `useQuery` são geralmente relançados e capturados em `onError` da `useMutation`, disparando um toast.
- **Sucesso**: `toast.success("mensagem")`.
- **Info**: `toast.info("mensagem")` (visto em `AuthContext` para sessão expirada).
- **Vazio**: mensagem inline dentro do card/container, sem componente dedicado. Cada tela escreve a sua (ex.: `"Nenhum usuário encontrado"`).
- **Confirmação destrutiva**: `<AlertDialog>` de shadcn (ver `UserManagement.tsx` para o padrão de "Confirmar exclusão").

### Toast

Import: `import { toast } from "sonner";`. O `<Toaster />` global é montado no root layout.

---

## 5. Convenções

### Nomenclatura de arquivos e pastas

- `src/routes/_authenticated/<nome>.tsx` — arquivo de rota (protegida por login). O router regenera `routeTree.gen.ts`.
- `src/page-views/<Nome>.tsx` — componente de página (PascalCase). A rota apenas importa e envolve com guards.
- `src/components/<dominio>/<Componente>.tsx` — componentes agrupados por domínio (`settings/`, `chat/`, `dashboards/`, `tasks/`, `workspace/`, ...). PascalCase.
- `src/components/ui/<primitivo>.tsx` — primitivos shadcn (kebab-case).
- `src/hooks/use<Nome>.ts` — hooks (camelCase começando com `use`).
- `src/lib/<util>.ts` — utilitários.
- `src/contexts/<Nome>Context.tsx` — contextos React.
- `supabase/functions/<nome-kebab>/index.ts` — edge functions.

### Idioma

- **UI (rótulos, títulos, mensagens de toast, texto de botões)**: **português do Brasil**. Exemplos em `Settings.tsx`: `"Configurações"`, `"Perfil"`, `"Usuários"`. Toasts em `AuthContext`: `"Sua sessão expirou. Faça login novamente."`.
- **Código (variáveis, funções, tipos, chaves de query, nomes de arquivo)**: **inglês**. Ex.: `useUserRole`, `workspaceRole`, `isAdmin`, `AdminRoute`.
- Comentários no código: mistos — tanto português quanto inglês aparecem.

### Datas

- Biblioteca: **`date-fns`** (já em `package.json`).
- Utilitário do projeto: `src/lib/dateUtils.ts` — expõe `parseLocalDate(dateString)` para converter strings `YYYY-MM-DD` em `Date` local, evitando o problema de UTC que faz datas aparecerem um dia antes em UTC-3.
- Formato exibido: geralmente `dd/MM/yyyy` (padrão brasileiro), com locale `ptBR` de `date-fns/locale` quando necessário.
- Não existe helper centralizado de formatação; cada tela chama `format(...)` de `date-fns` diretamente.

---

## Referências rápidas de arquivos

| Assunto | Arquivo |
|---|---|
| Guard de autenticação | `src/components/ProtectedRoute.tsx` |
| Guard de workspace | `src/components/WorkspaceRequiredGuard.tsx` |
| Guard de admin | `src/components/AdminRoute.tsx` |
| Hook de papel | `src/hooks/useUserRole.ts` |
| Hook de papel Hub | `src/hooks/useAppRole.ts` |
| Layout autenticado | `src/routes/_authenticated/route.tsx` |
| Sidebar | `src/components/AppSidebar.tsx` |
| Tela admin exemplar | `src/page-views/Settings.tsx` + `src/components/settings/UserManagement.tsx` |
| Edge function exemplar | `supabase/functions/get-user-emails/index.ts` |
| Cliente Supabase (frontend) | `src/integrations/supabase/client.ts` |
| Utilitário de datas | `src/lib/dateUtils.ts` |
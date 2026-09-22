# Restringir edição dos "Responsáveis" do Space a administradores

## Diagnóstico (verificado)

Hoje, **qualquer membro do workspace** consegue alterar Account, Head de Projetos e Head de Account:

- Na tela (`src/page-views/SpaceDetailView.tsx`), os seletores do card "Responsáveis" não têm nenhuma verificação de permissão.
- No banco, a política de atualização da tabela `spaces` ("Only privileged members can update spaces") permite UPDATE para quem tem papel `admin` **ou `member`** no workspace.

Ou seja: visualmente e na regra de acesso, membros comuns podem editar.

## O que será feito

Considerar "administrador" = **admin do workspace** (papel `admin` em `workspace_members`) **ou admin do sistema** (`global_owner`, `owner`, `admin` em `user_roles` — mesma regra já usada para excluir spaces).

### 1. Tela do Space (somente leitura para não-admins)
- Criar/obter o papel do usuário no workspace (lendo `workspace_members.role` do workspace atual) e combinar com o papel global já disponível em `useUserRole`.
- No card "Responsáveis" de `SpaceDetailView.tsx`:
  - **Admin:** seletores funcionam como hoje.
  - **Não-admin:** os três campos aparecem somente leitura (nome/avatar da pessoa ou "Não definido"), sem possibilidade de alterar.

### 2. Trava no banco (garantia real, independente da tela)
- Migração com trigger `BEFORE UPDATE` em `public.spaces` que:
  - Compara `OLD` vs `NEW` apenas nas colunas `account_user_id`, `head_projetos_user_id` e `head_account_user_id`.
  - Se alguma mudou e o autor (`auth.uid()`) não for admin do workspace nem admin do sistema, lança erro e bloqueia a gravação.
  - Demais colunas (nome, descrição etc.) continuam editáveis por membros, como hoje.

### 3. Verificação
- Typecheck.
- Teste na tela com usuário admin (edita) e membro comum (somente leitura).

## Fora de escopo
- Não muda quem pode editar nome/descrição do space nem outras telas.
- Não altera os relatórios de produtividade que leem esses campos.

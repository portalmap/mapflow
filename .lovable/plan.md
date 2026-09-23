# Seguidores: só administradores removem + Account vira seguidor do Space

## 1. Somente administradores removem/editam seguidores

Regra: qualquer membro pode **adicionar** seguidores (Space, Pasta, Lista, Tarefa). **Remover ou alterar** fica restrito a administradores do workspace e administradores/proprietários globais.

- Banco: nas 4 tabelas de seguidores, a permissão de exclusão passa a exigir administrador. Não há hoje permissão de edição para membros; continua assim (só admin).
- Propagações automáticas (seguir/deixar de seguir em cascata) e o gatilho de automações do banco continuam funcionando, pois já rodam com privilégio do sistema.
- Automações que rodam no app só adicionam seguidor, então não são afetadas.
- Tela: botão de remover seguidor (e "deixar de seguir") só aparece para administradores; demais veem a lista em modo leitura com o botão "Adicionar".

## 2. Account do Space = seguidor automático do Space

- Ao definir o Account no card "Responsáveis", essa pessoa vira seguidora do Space (origem "account"), propagando para pastas, listas e tarefas como hoje.
- Ao trocar o Account: o anterior perde apenas o seguimento vindo de "account" (se ele também segue manualmente, continua). Ao limpar o campo: idem.
- Seguidor de origem "account" não pode ser removido pela tela, nem por admin — só trocando o Account.
- Aplicação retroativa: todos os Spaces que já têm Account passam a tê-lo como seguidor.

## Detalhes técnicos

- Migração:
  - Substituir as políticas DELETE de `space_followers`, `folder_followers`, `list_followers`, `task_followers` por `is_workspace_admin`/`is_global_owner`/`is_system_admin` (mesmo critério do `guard_space_responsaveis_update`).
  - Função `SECURITY DEFINER` `sync_space_account_follower()` + trigger AFTER INSERT/UPDATE OF `account_user_id` em `spaces`: upsert em `space_followers` com origem `account`, delete da origem `account` do anterior. Os triggers de propagação existentes cuidam da cascata.
  - Backfill idempotente para spaces com `account_user_id`.
- Frontend: `useSpaceFollowers`, `useFolderFollowers`, `useListFollowers`, `useTaskFollowers` e componentes que exibem o botão remover passam a checar permissão de admin (hook de papel já usado no card Responsáveis). Origem `account` exibida como "Account do Space", sem remover.
- Alterações confinadas ao módulo Seguidores e ao trigger do Space.

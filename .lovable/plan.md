# Ações automáticas também valendo para tarefas vindas da API

## Diagnóstico (confirmado)

As ações automáticas de criação de tarefa (atribuir responsável, adicionar seguidor, remover todos os responsáveis) hoje só rodam no navegador: a função `applyAutomationsToTask` é chamada em `src/hooks/useTasks.ts` e nos hooks de mudança de status. Quando a tarefa entra pelo canal de integração (Social Flow via `hub-inbox`), nada disso executa — a tarefa é gravada direto no banco e nenhuma automação é consultada.

Números atuais no banco:
- 180 tarefas criadas pela integração (com referência de post externo).
- 112 delas sem nenhum responsável.
- 40+ regras ativas de "atribuir responsável" com gatilho "ao criar tarefa", em nível de lista.

Não existe nenhum gatilho no banco que aplique automações; o único gatilho na criação de tarefa apenas registra a atividade.

## Solução: mover a execução para o banco

A regra passa a valer para qualquer origem — tela, integração, importação, script — porque fica no mesmo lugar onde a tarefa nasce.

1. Uma função no banco que, dada uma tarefa, monta a hierarquia (workspace → space → pasta → lista), busca as automações ativas cujo gatilho seja de criação/entrada na lista e aplica:
   - atribuir responsável (aceita lista de usuários e o formato antigo de um único usuário);
   - adicionar seguidor;
   - remover todos os responsáveis.
2. Um gatilho em "tarefas", após inserir, chama essa função. Vale para a API e para a tela.
3. A gravação de responsável/seguidor é idempotente (não duplica), então a chamada que já existe no navegador continua funcionando sem efeito duplo. Nada é removido do frontend nesta etapa, para não mexer em nenhum outro módulo.
4. Reprocessamento pontual: aplicar as regras nas 112 tarefas da integração que ficaram sem responsável, sem tocar nas que já têm.

## Escopo e limites

- Só as três ações acima entram no gatilho de criação. Ações de mudança de status, etiquetas, webhooks e notificações continuam como estão hoje (módulos separados, sem alteração).
- Nenhuma mudança visual.
- Nenhuma mudança nas regras já cadastradas — elas passam a valer também para a API.

## Detalhes técnicos

- Migration com `public.apply_task_creation_automations(p_task_id uuid)` em `SECURITY DEFINER`, `search_path = public`, lendo `automations` (enabled, workspace do task, `action_type in ('auto_assign_user','auto_add_follower','remove_all_assignees')`) e filtrando gatilho primário + `action_config->'or_triggers'` contra `on_task_created`, `on_task_moved_here`, `on_task_added_here`.
- Escopo: aceita `scope_type='workspace'` com `scope_id` nulo, ou `scope_id` pertencente a {workspace, space da lista, pasta da lista, lista}.
- Inserção em `task_assignees` / `task_followers` com `ON CONFLICT (task_id,user_id) DO NOTHING`, preenchendo `source_type` e `source_id` como o código atual faz.
- `CREATE TRIGGER trg_tasks_apply_automations AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION ...` (wrapper que chama a função com `NEW.id`). Exceções capturadas e registradas para nunca derrubar a criação da tarefa.
- Backfill: `SELECT apply_task_creation_automations(id) FROM tasks WHERE external_post_ref IS NOT NULL AND NOT EXISTS (select 1 from task_assignees where task_id = tasks.id)`.
- `hub-inbox` não precisa de alteração de código.

## Verificação

- Contagem de tarefas da integração sem responsável antes/depois do backfill.
- Criação de tarefa pela tela continua atribuindo apenas uma vez (sem duplicidade em `task_assignees`).

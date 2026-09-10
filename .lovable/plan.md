# Marcar avisos como lidos quando o item for resolvido

Hoje um aviso só sai da lista quando a pessoa clica nele. Vamos fazer com que ele se marque como lido sozinho quando o motivo do aviso deixa de existir.

## Regras combinadas

- **Comentário/menção atribuída a você** (na tarefa ou no chat): ao marcar o comentário/mensagem como resolvido, o aviso correspondente daquela pessoa é marcado como lido.
- **Tarefa**: quando a tarefa é concluída, arquivada ou excluída, os avisos daquela tarefa (atribuição, vencendo amanhã, atrasada) são marcados como lidos para as pessoas atribuídas à tarefa.
- Só são afetados os avisos de quem foi atribuído — avisos de outras pessoas ou de outros assuntos continuam intactos.
- Vale para qualquer origem: pela tela, por automação, por integração do Hub ou por API.

## Limpeza do que já existe

Uma limpeza única marca como lidos os avisos ainda pendentes que se referem a comentários/mensagens já resolvidos e a tarefas já concluídas ou arquivadas. Hoje existem cerca de 190 avisos não lidos; boa parte deles deve desaparecer nessa limpeza.

O sino e a barra de avisos atualizam na hora, porque já escutam mudanças em tempo real.

## Detalhes técnicos

Tudo fica no banco, isolado no módulo de notificações — nenhuma tela ou hook de tarefas/chat muda de comportamento.

1. Função `public.mark_notifications_read_for_reference(ref_type, ref_id, user_ids uuid[])`: marca `is_read = true` em `notifications` não lidas com aquele `reference_type`/`reference_id`, restrito aos usuários informados.
2. Trigger `AFTER UPDATE` em `task_comments` (quando `resolved_at` passa de nulo para preenchido):
   - resolve avisos com `reference_type = 'comment'` e `reference_id = comment.id` para `assignee_id`;
   - se aquela pessoa não tiver mais comentário atribuído em aberto na mesma tarefa, resolve também os avisos do tipo `comment_assigned` com `reference_type = 'task'` e `reference_id = task_id` para ela.
3. Trigger `AFTER UPDATE` em `chat_messages` (mesma condição): avisos com `reference_type = 'chat_message'` e `reference_id = id` para `assignee_id`.
4. Trigger `AFTER UPDATE` em `tasks`: quando `completed_at` ou `archived_at` passa de nulo para preenchido, resolve avisos com `reference_type = 'task'` e `reference_id = tasks.id` para os `user_id` de `task_assignees` daquela tarefa.
5. Trigger `BEFORE DELETE` em `tasks`: mesma resolução antes da linha desaparecer (não há chave estrangeira entre `notifications.reference_id` e `tasks`).
6. Funções com `SECURITY DEFINER` e `SET search_path = public`, para funcionarem mesmo quando quem resolve não é o dono do aviso (a RLS de `notifications` só permite atualizar as próprias).
7. Limpeza retroativa em um comando de dados (`UPDATE` em `notifications`), seguindo as mesmas quatro correspondências acima.

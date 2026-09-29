# calendario.publicar: devolver o id da tarefa em `id` (não mais em `task_id`)

## Diagnóstico (confirmado)
- Em `supabase/functions/hub-inbox/index.ts`, a resposta de `calendario.publicar` monta `resultados` em 3 pontos, e todos usam o campo `task_id`:
  - linha ~549: tarefa já existia → `task_id: existente.id`
  - linha ~560: erro (status do canal não encontrado) → `task_id: null`
  - linha ~635: tarefa criada → `task_id: taskId`
- O restante do Relay já usa `id` como nome do campo do id da tarefa (padrão do MAP Flow).

## O que será feito (somente módulo hub-inbox)
1. Nos 3 pontos acima, renomear o campo `task_id` → `id` dentro de cada item de `resultados` (erro incluído: `id: null`).
2. Não alterar `external_post_ref`, `status`, `error`, `canal`, `status_disponiveis` nem nenhum outro campo da resposta raiz (`cliente`, `workspace_id`, `list_id`, `list_name`).
3. Observação: `task_id` usado internamente (inserção de anexos em `task_attachments`, marcação de origem) permanece igual — é coluna do banco, não campo de resposta.
4. Fazer deploy da função `hub-inbox`.

## Pergunta em aberto
- O plano anterior (apelidos de canal: `whatsapp_canal` → "Canal Whatsapp") ainda não está no código. Aprovar este plano aplica só a mudança de `task_id` → `id`; se quiser, incluo os apelidos de canal no mesmo deploy — basta avisar.

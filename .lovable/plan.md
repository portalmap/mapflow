# Aceitar "whatsapp_canal" e outros canais do Social Flow no calendario.publicar

## Diagnostico (confirmado)
- Hoje (29/09), entre 18:05 e 18:08 (Brasilia), chegaram 4 envios de `calendario.publicar` do cliente Accerth, 8 posts cada (mensagens f3757e25, 273f1758, 177c8f81, 520a58f3).
- Em todos, os 8 posts voltaram com `status: "erro"`, `error: "status_do_canal_nao_encontrado"`, `task_id: null`. Nenhuma tarefa foi criada (0 tarefas com essas referencias).
- Os `external_post_ref` devolvidos batem 8 de 8 com os `external_post_ref` recebidos em cada envio.
- Causa: o canal enviado e `whatsapp_canal`, mas o status da lista se chama "Canal Whatsapp". A comparacao atual so ignora pontuacao/maiusculas, entao `whatsapp canal` != `canal whatsapp`.
- O campo e `external_post_ref` (o `post_ref` recebido), nao `post_ref`.

## O que sera feito (somente modulo hub-inbox)
1. Em `supabase/functions/hub-inbox/index.ts`, `resolverStatusDoCanal`: adicionar tabela de apelidos de canal -> nome do status (ex.: `whatsapp_canal` -> "Canal Whatsapp", `whatsapp_comunidade` -> "Comunidade Whatsapp", `twitter`/`x` -> "X (Twitter)", `tiktok`, `linkedin`, `instagram`, `facebook`, `blog`), com fallback para a comparacao atual e para comparacao ignorando a ordem das palavras.
2. Manter a resposta de erro atual (com `status_disponiveis`) quando nenhum apelido servir.
3. Fazer deploy da funcao `hub-inbox`.
4. Reenvio: como nenhuma tarefa foi criada, o Social Flow pode reenviar os mesmos posts; a idempotencia por `external_post_ref` evita duplicar.

## Pergunta em aberto
Confirmar os nomes exatos dos canais que o Social Flow envia (alem de `whatsapp_canal`) para fechar a tabela de apelidos.

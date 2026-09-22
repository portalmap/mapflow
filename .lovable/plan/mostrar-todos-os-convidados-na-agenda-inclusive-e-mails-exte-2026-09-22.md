# Mostrar todos os convidados na Agenda (inclusive e-mails externos)

## O problema confirmado

Ao comparar o banco com o Google:

- Vários compromissos têm lista de convidados incompleta (ex.: "Alinhamento Tráfego MAP" com 2 convidados salvos; outro compromisso aparecendo com apenas 1 convidado enquanto o Google mostra 8).
- Não é falta de suporte a e-mails externos: já existem convidados de domínios externos salvos (gmail.com, accerth.com, avioesemusicas.com etc.).
- A causa está na gravação: a importação grava os convidados novos em um único lote e **não verifica erro**. A tabela tem dois índices únicos (por e-mail e por usuário no mesmo compromisso). Se apenas uma linha do lote conflitar (e-mail já existente, variação de maiúsculas, ou convidado já vinculado por usuário), o lote inteiro é recusado em silêncio e todos os convidados daquela página de compromissos ficam de fora.
- Como a atualização só reprocessa compromissos alterados, as listas incompletas ficam congeladas mesmo clicando em "Atualizar".

## O que será feito

1. Gravação resiliente de convidados na importação do Google
   - Trocar o lote "tudo ou nada" por gravação com conflito tratado (upsert) e, em caso de falha, gravar linha por linha.
   - Registrar no log quando uma linha falhar, em vez de ignorar silenciosamente.
   - Normalizar o e-mail (minúsculas, sem espaços) antes de comparar, para não brigar com o índice único.
   - Convidados externos continuam sendo salvos por e-mail, sem exigir usuário no sistema.

2. Reparar o que já está incompleto
   - Fazer a próxima atualização reespelhar a lista de convidados de todos os compromissos da janela sincronizada, mesmo quando o Google não indicar mudança no compromisso.
   - Limpar os marcadores de sincronização para que a próxima atualização percorra a janela completa uma vez.

3. Exibição
   - Manter a lista do cartão de leitura mostrando todos: nome quando existir, senão o e-mail, com organizador e status de resposta — inclusive externos e sem foto.

## Detalhes técnicos

- `src/lib/googleCalendarSync.server.ts`: no espelhamento de `calendar_event_guests`, usar `upsert` com `onConflict` e fallback individual; checar `error`; normalizar e-mails; marcar os eventos da página para reespelhamento de convidados independentemente do `etag`.
- Reset pontual de `sync_token`, `sync_tokens` e `sync_cursor` em `calendar_google_accounts` para forçar uma varredura completa (nada é alterado no Google).
- Sem mudança de schema e sem mudança nas políticas de acesso: o dono do compromisso já pode ver todos os convidados.

## Resultado esperado

Após aprovar e clicar em "Atualizar" na Agenda, os compromissos passam a mostrar a lista completa de convidados igual ao Google, incluindo e-mails externos.

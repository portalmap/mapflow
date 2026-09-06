# Mostrar os convidados dos compromissos da agenda

## O que está acontecendo

A agenda já sabe exibir a lista de convidados (nome, organizador, opcional e resposta), mas hoje não há nenhum convidado guardado: verifiquei o banco e existem 1.739 compromissos vindos do Google e **zero** convidados registrados.

O motivo: o espelhamento de convidados foi criado depois que os compromissos já tinham sido importados. A sincronização com o Google é "incremental" — ela só traz o que mudou desde a última vez. Como esses compromissos não mudaram, eles não voltam a passar pelo processo e os convidados nunca foram gravados.

## O que será feito

1. Zerar os marcadores de "já sincronizei até aqui" da conta Google conectada, para que a próxima sincronização releia a agenda completa do período e grave os convidados de cada compromisso.
2. Rede de segurança na sincronização: quando um compromisso do Google chegar e ainda não tiver convidados salvos aqui, os convidados são gravados mesmo que nada tenha mudado no compromisso — assim isso não volta a acontecer no futuro.
3. Conferir na tela de leitura do compromisso que aparecem: total de convidados, resumo (sim / não / sem resposta), organizador e marcação de "opcional".

Nada é criado ou alterado no Google — apenas leitura e espelhamento aqui. Compromissos sem convidados no Google continuam sem a seção de convidados.

## Detalhes técnicos

- Migração/limpeza pontual: `calendar_google_accounts.sync_tokens` (e cursor de página, se houver) para `null`, forçando listagem completa na próxima passada.
- `src/lib/googleCalendarSync.server.ts` (`applyPage`): garantir que o mapa `localIdByGoogleId` inclua eventos com etag igual (já inclui) e adicionar verificação de "evento sem linhas em `calendar_event_guests`" para não depender de mudança de etag.
- Nenhuma alteração em `useAgenda.ts`, nos componentes de leitura/edição, nem em outros módulos.

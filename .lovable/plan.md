# Agenda: parar a sincronização contínua e reagir na hora a mudanças no Google

## O que eu confirmei

- **Por que fica "Sincronizando"**: todo "Atualizar", e também toda vez que a Agenda é aberta, relê a agenda inteira no Google (do mês atual até 6 meses à frente). A sincronização nunca usa o modo incremental, que traz só o que mudou. A marca de "última leitura" de todas as contas está vazia, então cada rodada recomeça do zero. Com milhares de compromissos, isso vira dezenas de rodadas de 20 segundos.
- **Hoje nenhuma rodada terminou**: a data da última sincronização das três contas (Victor, Wendy e Portal) ainda é da noite de 22/09, e não há registro de erro. A sincronização está começando e não chega ao fim.
- **Não existe aviso automático do Google**: o MAP Flow não recebe nenhum aviso quando alguém cria, altera ou convida. As mudanças só chegam quando a Agenda é aberta ou quando você clica em "Atualizar".
- **Enviar convites já funciona na hora**: ao salvar um compromisso aqui, ele e os convidados vão para o Google na mesma sincronização. Quem já é avisado na hora é o Google, que manda o e-mail do convite. O problema está só no caminho de volta.

## O que vou fazer

1. **Sincronização incremental**: a primeira leitura continua completa, a partir do mês vigente. Depois disso, cada atualização pede ao Google só o que mudou desde a última leitura, então leva segundos.
2. **Não reler tudo ao abrir a Agenda**: abrir a tela mostra o que já está salvo e faz só a leitura incremental.
3. **Avisos do Google em tempo real**: cadastrar um aviso no Google para cada conta conectada. Quando chega um convite, uma alteração ou um cancelamento, o Google avisa o MAP Flow, que busca só aquela mudança. A tela se atualiza sozinha para quem estiver com a Agenda aberta.
4. **Renovação automática do aviso**: o Google expira esses avisos em cerca de 7 dias. Uma rotina diária renova antes de vencer. Se a renovação falhar, a Agenda volta a atualizar ao ser aberta.
5. **Destravar e mostrar o estado real**: gravar o motivo quando uma rodada não termina, limitar o número de rodadas e exibir "Atualizado às HH:MM" em vez de "Sincronizando" sem fim.

Continua valendo a regra: nada anterior ao mês vigente é importado, e nada é apagado no Google. O escopo fica só na Agenda.

## Detalhes técnicos

- `googleCalendarSync.server.ts`: usar `updatedMin = last_synced_at - 5min` junto com `timeMin/timeMax` quando houver leitura completa anterior. Usar `showDeleted=true` para capturar cancelamentos. A limpeza de sobras fica só na leitura completa. Gravar `last_synced_at` e `last_error` ao fim de toda rodada, inclusive nas interrompidas, com log de páginas e tempo.
- Nova coluna em `calendar_google_accounts`: `full_synced_at` (quando a última leitura completa terminou), `watch_channel_id`, `watch_resource_id`, `watch_expires_at`, `watch_token`.
- `POST /calendars/primary/events/watch` ao conectar e na renovação. Rota pública `src/routes/api/public/google-calendar/webhook.ts` valida `X-Goog-Channel-Token` e `X-Goog-Channel-ID` com o que está salvo, responde 200 na hora e dispara a sincronização incremental daquele usuário.
- Tempo real na tela: incluir `calendar_events` na publicação de tempo real, com assinatura em `useAgendaEvents` filtrada por `user_id`, invalidando `['agenda-events']`.
- Renovação: rota `/api/public/google-calendar/renew`, protegida por segredo, chamada diariamente pelo pg_cron. Ao desconectar, chamar `channels/stop`.
- `GoogleAgendaButton.tsx`: fazer só a leitura incremental ao abrir, com rótulo "Atualizado às HH:MM" e erro visível quando a rodada falhar.

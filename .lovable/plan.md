# Agenda: sem conta Google conectada, nada do Google aparece

## O que está acontecendo

Confirmei no banco: hoje existe **uma única** conexão Google ativa, a do `portal@assessoriamap.com.br`
(criada às 14:46, ainda sem sincronizar). O `victorborges@assessoriamap.com.br` **não tem mais
conexão Google**, mas continua com 2.509 compromissos vindos do Google salvos aqui, sincronizados
antes da conexão dele deixar de existir. É por isso que o "Jantar com Família" ainda aparece na
agenda dele: são sobras da sincronização anterior, não um dado vivo.

O cruzamento por convidado (aparecer na agenda de quem foi convidado) continua como está — o
problema é só a sobra de quem não está conectado.

## O que vou fazer

1. **Limpar as sobras agora.** Apagar aqui os compromissos vindos do Google de qualquer pessoa que
   não tenha conexão Google ativa (hoje, os do victorborges). Nada é apagado no Google.
2. **Regra permanente.** Sempre que a Agenda for aberta e a pessoa não tiver conta Google conectada,
   os compromissos dela vindos do Google são removidos daqui automaticamente — igual ao que já
   acontece ao desconectar. Sobra apenas o que ela criou dentro do MAP Flow.
3. **Proteção na tela.** Enquanto a conexão estiver ausente, a Agenda não exibe nada vindo do Google,
   mesmo que ainda exista algum registro antigo.
4. **Reconectar resolve.** Ao conectar a conta Google de novo e sincronizar, tudo volta a aparecer,
   sem duplicar.
5. **Convites continuam.** Quem realmente está na lista de convidados segue vendo o compromisso,
   conectado ou não — isso não muda.

## Detalhes técnicos

- Limpeza inicial: `DELETE` em `calendar_events` (e filhos `calendar_event_guests`,
  `calendar_event_reminders`) onde `source = 'google'` e o `user_id` não tem linha em
  `app_user_connections` para `connector_id = 'google_calendar'`.
- `src/lib/google-calendar.functions.ts`: extrair a limpeza já usada em
  `disconnectGoogleCalendarAccount` para um helper (`purgeGoogleEventsForUser`) e chamá-lo em
  `getMyGoogleCalendarStatus` / `syncMyGoogleCalendar` quando `getConnectionKeyForUser` retornar
  `null`, removendo também a linha órfã em `calendar_google_accounts`.
- `src/hooks/useAgenda.ts` + `src/page-views/Agenda.tsx`: com status desconectado, filtrar
  `source === 'google'` dos eventos próprios (mantendo os eventos em que a pessoa é convidada).
- Nada muda na sincronização em si (`googleCalendarSync.server.ts` continua lendo só a agenda
  principal da própria conta) nem em outros módulos.

## Verificação

1. Entrar como victorborges sem reconectar: Agenda sem os compromissos do Google.
2. Reconectar e sincronizar: a semana volta a bater com a semana no Google, sem duplicatas.
3. Entrar como portal: após sincronizar, aparece a agenda própria dele.

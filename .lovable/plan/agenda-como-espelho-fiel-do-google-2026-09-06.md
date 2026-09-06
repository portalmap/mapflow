# Agenda como espelho fiel do Google

## Princípio

A Agenda passa a ser um espelho da sua agenda do Google: só a sua agenda entra, tudo com a etiqueta "Minha agenda", e ao desconectar nada do Google fica guardado aqui. "Criados aqui" fica apenas para quem não tem agenda do Google conectada.

## O que vou fazer

0. **Limpar tudo agora.** Apagar todos os compromissos da Agenda (com convidados e lembretes) e zerar as marcas de sincronização, para recomeçar do zero. Nada é apagado no Google.
1. **Importar só a sua agenda.** A sincronização lê apenas a sua agenda principal — que já contém os convites que outras pessoas te enviam. Agendas de colegas, feriados e aniversários deixam de entrar.
2. **Etiqueta única "Minha agenda".** Tudo que vem do Google aparece como "Minha agenda", independentemente de quem criou.
3. **Nada é apagado no Google.** Toda limpeza acontece apenas aqui.
4. **Desconectar apaga tudo do Google aqui.** Passado e futuro: nenhum compromisso vindo do Google continua salvo. Sem conexão, não há conteúdo do Google na Agenda; ao reconectar, tudo volta pela sincronização.
5. **"Criados aqui"** passa a ser só para compromissos criados dentro do MAP Flow — usado por quem não tem agenda do Google conectada.

## Detalhes técnicos

- Limpeza inicial via SQL: `DELETE FROM calendar_events` (todos os usuários) + filhos (`calendar_event_guests`, `calendar_event_reminders`) e `UPDATE calendar_google_accounts SET sync_token = NULL, sync_cursor/last_synced_at = NULL`.
- `src/lib/googleCalendarSync.server.ts`: remover a varredura de `/users/me/calendarList`; o cursor de sincronização passa a ter apenas a agenda principal (`calendar_id` da conta / `primary`). Manter `singleEvents=true`, RSVP, Google Tasks e o push local→Google como estão.
- `src/lib/google-calendar.functions.ts` (`disconnectGoogleCalendarAccount`): substituir a regra atual (apagar futuros + converter passados em locais) por `DELETE FROM calendar_events WHERE user_id = :userId AND source = 'google'`, apagando também convidados/lembretes órfãos; retornar a contagem removida.
- `src/hooks/useGoogleCalendar.ts`: ajustar a mensagem de desconexão (todos os compromissos do Google removidos, sem histórico).
- `src/lib/agendaCalendars.ts`: `primary`/e-mail da conta → "Minha agenda"; sem rótulos por criador.
- Sem mudança em tarefas, convites, Gestão, chat ou demais módulos.

## Verificação

1. Agenda abre vazia depois da limpeza.
2. Sincronizar: só aparece "Minha agenda" (+ "Criados aqui" se houver eventos locais); a semana bate com a semana no Google.
3. Desconectar: Agenda fica sem nenhum compromisso do Google. Reconectar e sincronizar: tudo volta, sem duplicatas.

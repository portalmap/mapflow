# Agenda: acabar com compromissos duplicados

## O que está acontecendo (confirmado no banco)

Consultei os compromissos gravados. As duplicatas são do mesmo usuário (Victor e Portal), no mesmo horário e com o mesmo título, mas gravadas com dois identificadores diferentes do Google. Exemplos:

- "Atividade Física" 24/08 08:30 → ids `7kds411p...20260824T083000Z` e `pmf4fnqjj98...`
- "Internacionalização", "Escritório Virtual", "Daily Estratégica | MAP" → mesmo padrão

Ou seja: um dos registros é a ocorrência de um compromisso repetido e o outro é uma cópia antiga do mesmo compromisso, gravada em uma sincronização anterior. Hoje o sistema só reconhece que dois registros são "o mesmo" quando o identificador do Google é idêntico — então a cópia antiga nunca é reaproveitada nem removida, e as duas aparecem na tela.

Sim, dá para reconhecer que é o mesmo compromisso: o Google entrega, junto de cada compromisso, um código único do compromisso (iCalUID) que é o MESMO em todas as agendas e em todas as cópias — é exatamente essa a chave que falta ser guardada aqui.

## O que vai ser feito

1. Guardar o código único do compromisso (iCalUID) em cada registro da agenda.
2. Na sincronização, antes de criar um registro novo, procurar se já existe um com o mesmo código único + mesmo horário + mesmo usuário. Se existir, atualizar esse registro em vez de criar outro.
3. Impedir duplicata no próprio banco, com uma regra de unicidade por usuário + código único + horário de início.
4. Limpeza única dos duplicados que já existem, mantendo sempre o registro sincronizado mais recentemente (nada é apagado no Google).
5. Varredura de sobras: quando a sincronização completa terminar, registros do mesmo período que o Google não devolveu mais deixam de aparecer aqui.
6. Para quem NÃO tem agenda conectada (caso em que aparecem os compromissos em que a pessoa foi marcada como convidada): agrupar pelo código único, para que o mesmo compromisso vindo de duas agendas diferentes apareça uma única vez.

A regra atual continua igual: com agenda conectada, só a própria agenda; sem agenda conectada, os compromissos em que a pessoa foi convidada.

## Detalhes técnicos

- Migração: `calendar_events.google_ical_uid text`; índice único parcial `(user_id, google_ical_uid, starts_at)` onde `google_ical_uid is not null and deleted_at is null`; migração de limpeza que marca `deleted_at` nos duplicados (partição por usuário/título/starts_at, ordem por `last_synced_at desc`) e faz backfill do uid quando derivável do `google_event_id` (prefixo antes de `_`).
- `src/lib/googleCalendarSync.server.ts`: mapear `ev.iCalUID` no row; trocar o `upsert({ onConflict: 'user_id,google_event_id' })` por resolução prévia por `(user_id, google_ical_uid, starts_at)`, reaproveitando `id` e atualizando `google_event_id`; manter o fallback individual já existente. Após uma sincronização completa (sem `syncToken`), marcar `deleted_at` nos eventos `source='google'` daquele calendário/janela que não constam no lote.
- `src/hooks/useAgenda.ts` (`useAgendaEvents`): no caminho sem conexão, deduplicar por `google_ical_uid ?? google_event_id ?? id` + `starts_at`, preferindo o registro do próprio usuário.
- Escopo restrito ao módulo Agenda; nada de mudanças em tarefas, automações ou notificações.

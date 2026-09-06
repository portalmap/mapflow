# Por que "Victor Borges" aparece com 5 — e como corrigir

## A lógica de hoje (verificada no banco)

O filtro NÃO agrupa por "quem foi convidado". Ele agrupa pela **agenda de origem** de cada compromisso importado do Google, e conta **apenas os compromissos do período que está na tela**.

Na sua conta hoje existem:

| Origem gravada | Total | Nesta semana (6–12/09) |
|---|---|---|
| Agenda do Rodrigo Braz | 1.496 | 50 |
| Sua agenda do Google ("primary") | 194 | 5 |
| Agenda da Wendy Uda | 1 | 1 |
| Criados aqui, sem vínculo com o Google | 619 | 0 |
| Antigos do Google que perderam o vínculo na desconexão | 469 | 0 |

Ou seja: os **5** são os compromissos desta semana que estão gravados na **sua** agenda do Google. Os outros 50 da semana foram importados da **agenda do Rodrigo** (você tem acesso a ela, então a sincronização trouxe a cópia dela) — mesmo quando o compromisso é seu, ele entra rotulado como "Rodrigo Braz", porque foi lido de lá. Tanto que há compromissos repetidos ("Prospecção Ativa" aparece duas vezes no mesmo dia).

Resumo do problema: a etiqueta hoje diz "de qual agenda o compromisso foi lido", e não "de quem é o compromisso".

## O que proponho mudar

1. **Uma cópia por compromisso.** Quando o mesmo compromisso existir na sua agenda e na de outra pessoa, manter só um (o da sua agenda), acabando com as duplicações na visualização.
2. **Etiqueta pelo dono do compromisso.** Passar a classificar pelo organizador/criador do compromisso, e não pela agenda de onde foi lido. Assim uma reunião criada por você aparece em "Minha agenda", mesmo tendo vindo pela agenda do Rodrigo.
3. **Juntar o histórico antigo.** Os 469 compromissos que perderam o vínculo na desconexão voltam a contar como "Minha agenda", em vez de "Criados aqui" (que fica só para os criados dentro do MAP Flow).
4. **Padrão mais útil.** Ao abrir a Agenda pela primeira vez, vem marcada só a sua agenda; as demais ficam disponíveis para marcar quando quiser.
5. A contagem ao lado de cada nome continua sendo a do período exibido (mês/semana/dia) — é o que o Google faz também. Se preferir o total geral, digo aqui e mudo.

## Detalhes técnicos

- Migration: adicionar `organizer_email` e `creator_email` em `calendar_events`; preencher no `googleCalendarSync.server.ts` a cada importação e fazer um backfill dos existentes na próxima sincronização.
- Deduplicação por `google_event_id` (mantendo a linha da agenda própria) na sincronização + limpeza única das duplicatas já gravadas.
- `src/lib/agendaCalendars.ts`: `calendarIdOf` passa a usar `organizer_email` (fallback `creator_email`, depois `google_calendar_id`); `primary` + `source=local` deixa de cair em "Criados aqui".
- `src/hooks/useAgendaCalendars.ts`: estado inicial (sem preferência salva) esconde as agendas que não são a própria.
- Sem mudança em sincronização de tarefas, convites, Gestão ou demais módulos.

## Verificação

1. Semana atual: "Prospecção Ativa" deixa de aparecer duplicado.
2. Reuniões criadas por você aparecem em "Minha agenda", não em "Rodrigo Braz".
3. Ao abrir a Agenda, só a sua agenda vem marcada.

# Compromisso: primeiro uma tela de leitura, depois edição espelhando o Google

## Como vai funcionar

**1º clique no compromisso → tela de leitura** (nada editável), no estilo do Google:

- Título, cor da agenda, data e horário ("Quinta-feira, 3 de setembro · 08:45 – 09:00").
- Repetição, quando houver ("Semanal: dias úteis").
- Botão **Entrar com o Google Meet** + link `meet.google.com/...` para copiar, quando o compromisso tiver Meet.
- Telefone de acesso, quando o Google enviar.
- Local, quando houver.
- Lembretes ("Notificação 10 minutos antes").
- **Convidados**: lista com nome/e-mail, quem é o organizador, e o resumo "5 convidados · 2: sim · 1: não, 2: pendente", com o mesmo símbolo de cada resposta.
- Descrição/pauta do compromisso.
- Barra inferior "Você vai?" com **Sim / Não / Talvez** (já existe hoje e continua gravando no Google).
- Ações no topo: **Editar** (lápis), **Excluir** (lixeira), **Abrir no Google Agenda** e **Fechar**.

**Botão Editar → tela cheia de edição** (modal grande, ocupando a tela), com o que o Google oferece:

- Título, data/hora de início e fim, fuso exibido, "Dia inteiro" e **repetição** (não repete, diário, semanal, dias úteis, mensal, anual).
- **Convidados**: adicionar pessoas do MAP Flow ou por e-mail, remover, ver a resposta de cada um, e as permissões: *Modificar evento*, *Convidar outras pessoas*, *Ver lista de convidados*.
- **Google Meet**: botão "Adicionar videoconferência" (cria o Meet no Google) e remover.
- Local, notificações (uma ou mais, em minutos/horas/dias), cor, **Ocupado/Disponível**, visibilidade (padrão/pública/privada), descrição.
- Salvar envia tudo para o **Google Agenda** (inclusive os convites por e-mail); nada fica só aqui.

## O que muda no espelhamento

- Os convidados dos compromissos que vêm do Google passam a ser importados (hoje só a resposta de quem já existia aqui era atualizada) — por isso a lista aparece vazia nos compromissos do Google.
- Passam a ser espelhados também: organizador, permissões dos convidados, ocupado/disponível, visibilidade, telefone de acesso, repetição e lista de notificações.
- Compromissos criados por outra pessoa continuam apenas em leitura (Google só permite editar quem tem permissão) — o botão "Editar" some e fica só o "Você vai?".
- Em compromisso repetido, a edição altera **somente aquele dia** (ocorrência), como o Google faz por padrão.

## Detalhes técnicos

- Migração no banco (colunas novas em `calendar_events`): `recurrence` (text[]), `recurring_event_id`, `organizer_email`, `organizer_name`, `guests_can_modify`, `guests_can_invite_others`, `guests_can_see_others`, `transparency`, `visibility`, `reminders` (jsonb, lista), `conference_phone`, `conference_pin`, `can_edit` (derivado do Google). Em `calendar_event_guests`: `is_organizer`, `optional`, `is_self`. Sem `GRANT`/RLS novos além do padrão já usado nessas tabelas.
- `src/lib/googleCalendarSync.server.ts` (módulo de sincronização, isolado):
  - `fromGoogleEvent`: mapear `attendees` completos, `organizer`, `guestsCanModify/InviteOthers/SeeOtherGuests`, `transparency`, `visibility`, `reminders.overrides`, `conferenceData.entryPoints` (telefone/PIN), `recurringEventId`; buscar o mestre (`recurringEventId`) uma vez por sincronização para gravar o `RRULE`.
  - novo `upsertGuestsFromGoogle()` — apaga/insere as linhas de `calendar_event_guests` conforme os `attendees`, substituindo o trecho que só atualizava `response_status`.
  - `toGooglePayload`: enviar `attendees` (com `optional`), `guestsCan*`, `transparency`, `visibility`, `reminders` (lista), `recurrence`; criação/remoção de Meet via `conferenceData.createRequest` com `conferenceDataVersion=1` na URL de POST/PATCH.
- `src/hooks/useAgenda.ts`: estender `CalendarEvent`/`CalendarGuest`/`EventInput` com os campos novos; `syncGuests` passa a gravar `optional`.
- Novo `src/components/agenda/AgendaEventViewDialog.tsx` (somente leitura) + novo `src/components/agenda/agendaRecurrence.ts` (RRULE → texto em português) e `src/components/agenda/AgendaGuestList.tsx` reaproveitado nas duas telas.
- `src/components/agenda/AgendaEventDialog.tsx` passa a ser a tela de edição em tela cheia (`sm:max-w-5xl h-[92vh]`, duas colunas: detalhes / convidados), com os campos novos.
- `src/page-views/Agenda.tsx`: clique abre a visualização; "Editar" abre o diálogo de edição. Sem mudanças em tarefas, chat, Gestão ou outros módulos.

## Verificação

1. Clicar num compromisso do Google mostra leitura com Meet, convidados, respostas e pauta como no print.
2. "Editar" abre a tela cheia; alterar horário, convidados e notificação e salvar reflete no Google Agenda.
3. "Adicionar videoconferência" gera link Meet visível aqui e no Google.
4. Compromisso de outra pessoa: sem "Editar", apenas "Você vai?".

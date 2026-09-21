# Agenda: cada pessoa vê apenas a sua própria agenda

## O que está acontecendo

Hoje a Agenda mostra dois grupos de compromissos: os da sua própria conta e também os
compromissos de outras pessoas nos quais você aparece como convidado. Quando você sincroniza
sua conta do Google, os convidados do compromisso são reconhecidos como usuários do MAP Flow,
e a partir daí esses usuários passam a ver o seu compromisso na Agenda deles — mesmo sem terem
conectado nenhuma conta do Google.

## O que vou fazer

1. A Agenda passa a mostrar **somente** os compromissos da própria pessoa: os que ela criou aqui
   e os que vieram da conta do Google dela.
2. Quem não conectou a conta do Google fica com a Agenda vazia (ou só com o que criou aqui) —
   não vê mais compromisso de ninguém, mesmo tendo sido convidado.
3. Quem conectou a conta do Google continua vendo normalmente os convites recebidos, porque eles
   já vêm pela sincronização da própria agenda.
4. Confirmar presença (sim/não/talvez) continua funcionando nos compromissos que aparecem na
   agenda da própria pessoa.

## Detalhes técnicos

- `src/hooks/useAgenda.ts` (`useAgendaEvents`): adicionar `.eq('user_id', user.id)` na consulta de
  `calendar_events`.
- Banco: remover a política de leitura `Guests can view invited events` em `calendar_events`
  (a de dono, `Owner manages own events`, permanece). Manter `calendar_event_guests` acessível ao
  dono do evento para exibir a lista de convidados; a política `Guest can view own invitation`
  deixa de dar acesso ao evento em si.
- Nada muda na sincronização com o Google (`googleCalendarSync.server.ts` já lê apenas a agenda
  principal da própria conta), nem no vínculo de convidado por e-mail, que segue sendo usado para
  mostrar nomes e fotos.
- Nenhum outro módulo é afetado (tarefas, chat, Gestão, notificações).

## Verificação

1. Entrar com um usuário sem Google conectado: Agenda sem compromissos de outras pessoas.
2. Entrar com a conta conectada: a semana bate com a semana no Google, incluindo convites recebidos.
3. Abrir um compromisso com convidados: lista de convidados e RSVP continuam funcionando.

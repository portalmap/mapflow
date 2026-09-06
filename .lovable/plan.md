# Filtro de agendas na Agenda (como no Google)

## Situação atual (verificada)

Os compromissos importados do Google guardam de qual agenda vieram. Hoje existem, na sua conta:

- Rodrigo Braz — 1.897
- Sua agenda principal — 1.012
- Victor Borges — 493
- Mirian Vilivas — 386
- Portal — 347
- Amanda Tavares — 344
- Wendy Uda — 1

Ou seja: as agendas de colegas continuam aparecendo porque foram importadas antes, e não existe nenhum controle na tela para escolher o que exibir.

## O que muda

Um painel novo "Minhas agendas", igual ao do Google, ao lado do calendário:

- Lista cada agenda encontrada nos seus compromissos (sua agenda, agendas de colegas e "Criados aqui" para os compromissos locais), com o nome da pessoa quando possível.
- Uma caixinha de marcar por agenda: desmarcada, os compromissos daquela pessoa desaparecem da visualização (Mês, Semana e Dia). Nada é apagado.
- Cada agenda ganha uma cor fixa própria, e os compromissos vindos dela passam a usar essa cor — dá para saber de quem é o compromisso pela cor.
- Botões rápidos: "Somente a minha" e "Todas".
- A escolha fica guardada no navegador, então na próxima visita a agenda abre já filtrada do jeito que você deixou.
- Em telas pequenas o painel vira um botão "Agendas" que abre a lista.

Sincronização com o Google, convites, tarefas, Gestão e os demais módulos continuam iguais.

## Detalhes técnicos

- Novo módulo isolado `src/components/agenda/AgendaCalendarFilter.tsx` + `src/lib/agendaCalendars.ts`:
  - deriva a lista de agendas a partir de `google_calendar_id` dos eventos carregados (normalizando `primary` para a conta conectada, lida de `calendar_google_accounts`), com fallback "Criados aqui" para `source != 'google'`;
  - resolve nome de exibição pelo `profiles.email` quando existir, senão usa o próprio e-mail;
  - paleta determinística (hash do id da agenda) mapeada em tokens do design system;
  - seleção persistida em `localStorage` (`agenda:calendars:<userId>`), leitura via `useEffect` para não quebrar hidratação.
- `src/page-views/Agenda.tsx`: filtra `events` pela seleção antes de passar para as views e renderiza o painel (aside no desktop, Sheet no mobile).
- `AgendaWeekView.tsx` / `AgendaMonthView.tsx`: a cor do bloco passa a vir de um `calendarColor` resolvido pelo helper quando o evento é do Google; nenhuma mudança de layout/sobreposição.
- Sem migração, sem mudança em hooks de dados, RLS ou sincronização.

## Verificação

1. Abrir /agenda: painel lista as 7 agendas com cores distintas.
2. Desmarcar Rodrigo/Mirian/Amanda: os blocos deles saem nas três visões; "Somente a minha" deixa apenas a sua.
3. Recarregar a página: a seleção permanece.

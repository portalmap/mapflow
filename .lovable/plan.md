# Agenda: acabar com os compromissos duplicados

## O que está acontecendo

Quando alguém te convida, o mesmo compromisso chega por dois caminhos:

1. pela **sua** conta Google conectada (o Google já coloca o convite na sua agenda);
2. pela agenda **de quem convidou**, que também está no MAP Flow e te lista como convidado.

Resultado: o compromisso aparece duas vezes na semana, como nas imagens que você enviou.

## Regra que vou aplicar

- **Com conta de e-mail conectada na Agenda:** você vê apenas os compromissos da sua própria
  agenda. A integração já traz os convites, então nada mais é cruzado a partir das agendas
  de outras pessoas (nem de marcações internas do sistema).
- **Sem conta conectada:** continua valendo o cruzamento — você vê os compromissos em que foi
  citado como convidado por outras pessoas do MAP Flow.

Nada muda no Google e nada é apagado: a mudança é só sobre o que a tela exibe.

## Detalhes técnicos

- `src/hooks/useAgenda.ts` → `useAgendaEvents`: passa a receber o estado da conexão
  (`useMyGoogleStatus`) e, quando conectado, aplica `.eq('user_id', user.id)` na consulta de
  `calendar_events`; desconectado, mantém a consulta atual (RLS entrega os eventos em que a
  pessoa é convidada). A chave do `useQuery` inclui esse estado para revalidar ao conectar/desconectar.
- `src/page-views/Agenda.tsx`: remove o filtro local `ownedEvents` (criado para esconder sobras),
  já coberto pela nova regra na consulta; a tela volta a passar os eventos direto para
  `useAgendaCalendars`.
- Sem alterações em `googleCalendarSync.server.ts`, em políticas do banco ou em outros módulos.

## Verificação

1. Conectado: a semana mostra exatamente o que aparece no Google, sem repetição.
2. Desconectado: compromissos em que você é convidado por colegas continuam visíveis.
3. Conectar/desconectar atualiza a tela sem precisar recarregar.

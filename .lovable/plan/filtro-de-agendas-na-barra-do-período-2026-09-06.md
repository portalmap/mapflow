# Filtro de agendas na barra do período

## O que muda

- O painel "Minhas agendas" sai da coluna lateral e passa a ser um botão na mesma linha do período (ao lado de Hoje / setas / tela cheia).
- Ao clicar no botão, abre um pequeno painel flutuante com a mesma lista: "Somente a minha", "Todas", cada agenda com sua cor, nome e quantidade.
- O espaço lateral é liberado, então a agenda ocupa toda a largura da tela.
- No celular, o mesmo botão abre o painel (substitui o atalho atual).

## Cores

- Cada e-mail/agenda recebe uma cor distinta, atribuída por ordem, sem repetição enquanto houver cores disponíveis na paleta.
- Quando a lista de agendas passa do total de cores da paleta, a mesma cor volta a ser usada em um tom diferente (mais claro/escuro), de forma que duas agendas nunca fiquem visualmente iguais.
- A cor de cada agenda é estável: continua a mesma entre sessões e nos eventos exibidos no mês/semana/dia.

## Detalhes técnicos

- `src/lib/agendaCalendars.ts`: substituir a escolha de cor por hash por atribuição sequencial determinística (ordenação estável dos ids) + geração de variação de tom (ajuste de luminosidade em HSL) para ciclos além do tamanho da paleta.
- `src/components/agenda/AgendaCalendarFilter.tsx`: mantido como conteúdo; envolvido por `Popover` acionado por um botão com ícone `ListFilter` (mostra a contagem de agendas ocultas quando houver).
- `src/page-views/Agenda.tsx`: remover o `aside` lateral e o `Sheet` mobile; inserir o botão do filtro no grupo do período. Nada muda na sincronização, no schema, nas RLS ou nos demais módulos.

# Painéis da direita na tela "Tudo" — caber sempre na tela

Hoje, ao abrir "Responsável" ou "Seguidor", o painel da direita fica cortado pela borda da tela (no print aparece só "Responsá..."), porque a área central da lista não encolhe para dar espaço: ela mantém a largura do conteúdo e empurra o painel para fora.

## O que muda

- A área central da lista passa a encolher de verdade quando um painel abre, com barra de rolagem horizontal própria para as colunas (Tarefa, Status, Responsável, Vencimento, Prioridade) quando o espaço ficar curto. Nenhuma coluna é escondida — dá-se rolagem lateral.
- Os painéis da direita ficam com largura fixa garantida (sem cortar), mas com rolagem interna para a lista de pessoas.
- Em telas estreitas (celular/tablet), os painéis abrem sobrepostos, deslizando pela direita e cobrindo parte da tela, em vez de disputar largura com a lista.
- Abrir os dois painéis ao mesmo tempo continua possível no desktop largo; em telas menores, abrir um fecha o outro para não sobrecarregar.
- O cabeçalho da tela (título, seletor de workspace, busca e botões) acomoda em várias linhas quando falta largura, sem textos sobrepostos.

## Detalhes técnicos

- `src/page-views/EverythingView.tsx`: no container raiz e na coluna central, aplicar `min-w-0 overflow-hidden`; painéis com `shrink-0`; cabeçalho em grid/flex-wrap responsivo com `min-w-0` nos blocos de texto.
- `src/components/everything/EverythingTableView.tsx`: envolver a tabela em um wrapper com `overflow-x-auto` e largura mínima por coluna, mantendo a rolagem vertical do conteúdo.
- `src/components/everything/AssigneeFilterPanel.tsx` e `FollowerFilterPanel.tsx`: `w-72 shrink-0` no desktop; em breakpoints menores, renderizar como painel sobreposto (posição absoluta/`Sheet`) com fundo e sombra.
- Nenhuma alteração em consultas, filtros ou lógica de dados — apenas layout e apresentação, restrito ao módulo da tela "Tudo".

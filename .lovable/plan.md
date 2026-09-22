# Corrigir contagem do filtro "Não atribuído" e atualização após ações em massa

## O que está acontecendo (verificado)

**1. Número do filtro não bate com a lista**

Não é paginação de tela — são duas causas somadas:

- A contagem ao lado de cada pessoa (e do "Não atribuído") é calculada sobre **todas** as tarefas carregadas, inclusive as **concluídas**. A lista, por padrão, **esconde concluídas**. No workspace existem 1.495 tarefas ativas, das quais 1.061 estão concluídas — por isso o contador mostra 255 e a lista mostra 41.
- A busca no banco não pede as tarefas em blocos, e o Supabase devolve no máximo **1.000 linhas por consulta**. Com 1.495 tarefas, quase 500 simplesmente não chegam à tela, o que também distorce contadores e agrupamentos.

**2. Tela não atualiza depois de ação em massa**

As ações em massa (status, prioridade, data, responsável, mover, copiar, arquivar, excluir) avisam o cache das listas antigas, mas **não avisam a lista da tela "Tudo"**. Por isso a ação conclui com sucesso e nada muda até recarregar a página.

## O que vai ser feito

### Contagens coerentes com a lista
- Os contadores dos painéis "Responsável" e "Seguidor" passam a ser calculados sobre a mesma base já filtrada (concluídas, status, prioridade, busca), excluindo apenas o próprio filtro de pessoa. Assim o número clicado é exatamente o número de linhas que aparece.

### Trazer todas as tarefas
- A busca de tarefas passa a paginar internamente (blocos de 1.000) até trazer tudo, tanto em "Tudo" quanto nas outras consultas de tarefas do workspace. Nada muda visualmente além de agora aparecerem todas.

### Atualizar a tela após ação em massa
- Todas as ações em massa passam a invalidar também as consultas da tela "Tudo" e as de responsáveis/seguidores, além de limpar a seleção ao terminar.
- A atribuição em massa passa a gravar em lote (uma operação só) em vez de um registro por vez, evitando lentidão e resultado parcial em seleções grandes.

## Detalhes técnicos

- `src/hooks/useFilteredAllTasks.ts`, `src/hooks/useAllTasks.ts`: loop com `.range(offset, offset + 999)` até a página vir incompleta; mesma lógica para as buscas auxiliares quando necessário.
- `src/page-views/EverythingView.tsx`: extrair a filtragem base (busca/status/prioridade/concluídas) em um `useMemo` e derivar `assigneeStats`/`followerStats` dessa base; manter os filtros de pessoa aplicados só na lista final.
- `src/hooks/useBulkTaskActions.ts`: extrair um helper de invalidação com as chaves `tasks`, `tasks-with-assignees`, `all-tasks`, `all-tasks-with-assignees`, `filtered-all-tasks`, `task-assignees`, `task-followers`, `my-assigned-tasks`, `taskStats`; usar em todos os hooks de ação em massa. `useBulkAssignTasks` passa a fazer um único `upsert` com o array completo de pares.
- Nenhuma alteração de banco, de automações ou de outros módulos.

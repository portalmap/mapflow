# Reduzir cabeçalho da Agenda

## Objetivo
Compactar o topo da página `/agenda` para liberar espaço vertical e focar no calendário em si.

## Mudanças

1. **Remover título e subtítulo**
   - Excluir o bloco com "Agenda" e "Seus compromissos, lembretes e convites em um só lugar".

2. **Consolidar controles em uma única linha**
   - Mover `GoogleAgendaButton` (Sincronizando/Reconectar) e o botão `+ Criar` para a mesma linha dos controles de período.
   - Layout proposto (desktop):
     ```text
     [<] [Hoje] [>] [Setembro de 2026] [↗]  [Sincronizando] [Reconectar] [+ Criar ▼]        [Mês] [Semana] [Dia]
     ```
   - Em telas menores, manter quebra responsiva: navegação de período + ações na primeira linha, tabs em uma segunda linha se necessário.

3. **Ajustar espaçamentos**
   - Reduzir `gap` e `padding` do cabeçalho para aproveitar melhor a altura da tela.
   - Garantir que o botão de tela cheia continue ao lado do período.

## Arquivos
- `src/page-views/Agenda.tsx` — único arquivo a ser alterado.

## Não alterar
- Funcionalidade de sincronização, criação de eventos, filtros de agendas, visualizações mês/semana/dia ou tela cheia.

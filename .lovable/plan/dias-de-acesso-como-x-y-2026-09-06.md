# Dias de acesso como "X / Y"

## O que muda

Na aba "Tempo no Flow" (Gestão), a coluna "Dias/semana" deixa de mostrar uma média e passa a mostrar:

- **X** = quantidade de dias em que a pessoa acessou dentro do período selecionado
- **Y** = quantidade total de dias do período selecionado

Exemplo: `5 / 7` nos últimos 7 dias.

Como hoje já existe uma coluna "Dias" com o mesmo X, as duas viram uma só coluna chamada **"Dias acessados"**, com o formato `X / Y`.

A exportação em CSV acompanha: sai a coluna de média por semana e entram "Dias com acesso" e "Dias do período".

## Detalhes técnicos

- `src/components/gestao/FlowUsageReport.tsx`:
  - calcular `periodDays` a partir do intervalo já usado nas consultas (`from`/`to`), contando dias de calendário (Hoje = 1; 7 dias = 7; Mês atual = dias decorridos do mês);
  - substituir as colunas "Dias" e "Dias/semana" por uma coluna "Dias acessados" com `{u.activeDays} / {periodDays}`;
  - ajustar o `colSpan` da linha vazia e o cabeçalho/linhas do CSV.
- Sem mudanças em banco de dados, nas funções de servidor ou em outros módulos; `daysPerWeek` continua existindo nos dados, apenas deixa de ser exibido.

## Verificação

1. Trocar o período entre Hoje / 7 dias / 30 dias / Mês atual e conferir o Y correspondente.
2. Conferir que X nunca passa de Y.
3. Exportar o CSV e ver as duas novas colunas.

# Data no histórico aparece um dia antes

## O que está acontecendo hoje

A data de entrega é guardada como data pura, sem hora: `2026-09-22`.

- No campo "Data de Entrega" ela é lida já com o cuidado de fuso horário, então mostra **22/09/2026** (correto).
- No histórico de atividade, o mesmo texto `2026-09-22` é convertido sem esse cuidado. O navegador entende como meia-noite no fuso de Londres (UTC) e, no horário de Brasília (3 horas atrás), isso vira **21/09/2026 às 21h** — ou seja, mostra o dia anterior.

Portanto o valor salvo está certo; apenas o texto do histórico exibe um dia a menos. Isso afeta as frases de data de entrega e data de início no histórico.

## Correção proposta

Usar no histórico a mesma leitura de data já usada no resto do sistema (`parseLocalDate`), para que `2026-09-22` seja sempre lido como 22/09 no fuso local.

- Registros antigos passam a ser exibidos corretamente também, pois a mudança é só na exibição.
- Nenhum dado é alterado no banco.

## Detalhe técnico

- `src/hooks/useTaskActivities.ts` — o helper `formatDate` usa `new Date(dateStr).toLocaleDateString('pt-BR')`. Trocar por `parseLocalDate(dateStr)` de `src/lib/dateUtils.ts` antes do `toLocaleDateString`, mantendo o fallback atual.
- Escopo restrito a esse helper (módulo de atividades); nada de datas/automações é tocado.

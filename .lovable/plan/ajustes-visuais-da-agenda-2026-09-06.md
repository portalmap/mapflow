# Ajustes visuais da agenda

## 1. Semana começando na segunda

- Semana e Mês passam a começar em **Segunda** e terminar em **Domingo**.
- O cabeçalho do Mês muda a ordem dos dias (Seg … Dom).
- O rótulo do período e a navegação anterior/próxima acompanham a nova semana.

## 2. Agenda ocupando a tela até o fim

- A grade de horários deixa de ter altura fixa calculada "no chute" e passa a medir o espaço realmente disponível: o quadro vai até o fim da janela, sem sobrar faixa vazia e sem passar da tela.
- A rolagem vertical acontece dentro da própria grade, e continua funcionando em tela cheia, em telas pequenas e ao redimensionar a janela.

## 3. Eventos curtos com altura fiel ao tempo

- Um evento de 15 minutos passa a ocupar exatamente 1/4 da altura de uma hora (hoje ele é esticado e parece 30 min).
- O texto do evento fica centralizado verticalmente e pode ser cortado acima/abaixo — sem tentar caber à força.
- O título completo continua visível ao passar o mouse e ao abrir o evento.

## Detalhes técnicos

- `src/page-views/Agenda.tsx`: `weekStartsOn: 1` em todos os `startOfWeek`/`endOfWeek`; layout do container em `flex` com `min-h-0` para o filho ocupar a altura restante em modo normal (hoje só o fullscreen é altura total).
- `src/components/agenda/AgendaMonthView.tsx`: `weekStartsOn: 1` e array `WEEKDAYS` reordenado.
- `src/components/agenda/AgendaWeekView.tsx`:
  - trocar `max-h-[calc(100vh-19rem)]` por `flex-1 min-h-0` (com wrapper em coluna flex) para a rolagem herdar o espaço real;
  - remover o piso `Math.max(..., 22)` da altura do bloco — altura = minutos × `MINUTE`, com mínimo de 1/4 de hora somente para eventos sem duração;
  - bloco com `justify-center`, `overflow-hidden` e texto sem `line-clamp` forçado, permitindo corte acima/abaixo;
  - `+N` e linha do "agora" continuam iguais.
- Nenhuma mudança em dados, sincronização com Google, hooks ou tipos.

## Verificação

1. Semana exibe Seg…Dom; Mês idem.
2. Sem espaço vazio abaixo da agenda em janela pequena, grande e em tela cheia.
3. Evento de 15 min mede 1/4 da hora; texto centralizado e cortado quando não cabe.

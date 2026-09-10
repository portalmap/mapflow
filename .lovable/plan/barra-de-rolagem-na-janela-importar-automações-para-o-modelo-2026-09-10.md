# Barra de rolagem na janela "Importar automações para o modelo"

## Problema

Na aba "De um Space / pasta / lista", a lista de Spaces cresce junto com o conteúdo: quando há muitos itens (ou ao expandir um Space), a lista passa do fim da janela e não aparece barra de rolagem, então os últimos itens e os botões "Cancelar / Importar automações" ficam difíceis de alcançar.

## O que será feito

- Dar altura máxima à área da lista, para que ela nunca ultrapasse a janela.
- Mostrar barra de rolagem vertical nessa área sempre que a lista for maior que o espaço disponível.
- Manter os botões de ação sempre visíveis na parte de baixo da janela.
- Manter tudo o resto igual: busca, seleção, expandir/recolher, e a aba "De outro modelo".

## Detalhes técnicos

Arquivo: `src/components/settings/ImportTemplateAutomationsDialog.tsx`

- A área de seleção usa `ScrollArea` com `flex-1 min-h-[280px]`. O `min-h` combinado com o conteúdo alto faz o container crescer em vez de rolar.
- Ajuste: trocar por altura limitada (`h-[45vh]` / `max-h`) mantendo `min-h-0` nos containers flex pai (`Tabs`, `TabsContent`) para que o `ScrollArea` realmente ative o overflow.
- Nenhuma mudança em dados, hooks ou lógica de importação; alteração apenas de layout dentro deste módulo.

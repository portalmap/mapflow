# Condição "OU" visível nas automações

Hoje o "E" que aparece entre duas condições já pode ser clicado para virar "OU", mas ninguém percebe que é um botão. A execução já respeita E/OU corretamente. O trabalho é deixar isso claro na tela.

## O que muda

1. **Seletor no topo do bloco de condições**
   Ao lado de "E se essa condição for verdadeira" entra uma escolha simples:
   - "Atender TODAS as condições" (E)
   - "Atender QUALQUER condição" (OU)
   Escolher uma aplica a todas as condições da automação de uma vez.

2. **Conector entre condições mais claro**
   O botãozinho do meio passa a ser um par de opções "E / OU", com a ativa destacada, deixando óbvio que é clicável. Continua permitindo misturar (ex.: primeira com E e segunda com OU); nesse caso o seletor do topo mostra "Personalizado".

3. **Resumo**
   No cabeçalho recolhido, além da quantidade de condições, aparece se são "todas" ou "qualquer".

## Detalhes técnicos

- Alteração restrita a `src/components/automations/advanced/ConditionsBuilder.tsx` (seletor global + conector como toggle group) e um pequeno ajuste de rótulo em `AdvancedAutomationBuilder.tsx` (resumo no cabeçalho).
- Formato salvo em `action_config.conditions` permanece igual: cada condição guarda `logic: 'AND' | 'OR'`. O seletor global apenas escreve o mesmo valor em todas.
- Nada muda em `useStatusChangeAutomations.ts` — `evaluateConditions` já avalia E/OU na ordem em que as condições aparecem.
- Mesmo ajuste aplicado no diálogo de automações de modelos (`TemplateAutomationDialog.tsx`), que reutiliza o mesmo construtor de condições.

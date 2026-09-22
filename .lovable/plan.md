# Erro ao escolher a data dentro de uma automação

## O que está acontecendo

A ação "Definir data de vencimento" (e "Definir data de início") tem um campo chamado internamente "Configuração de data", marcado como obrigatório.

Mas o formulário nunca preenche um campo com esse nome: ele grava separadamente o "Tipo de data" e, conforme a escolha, "Dia do mês", "Quantidade de dias" ou os dados de recorrência.

Resultado: a verificação antes de salvar procura o campo "Configuração de data", não encontra e mostra "Preencha o campo: Configuração de data" — mesmo com tudo preenchido na tela. Ou seja, é impossível salvar qualquer automação de data hoje.

## Correção

Trocar a verificação para olhar o que realmente está na tela:

- Exigir o "Tipo de data".
- Conforme o tipo escolhido, exigir o campo dependente:
  - Dias após o gatilho → quantidade de dias
  - Dia específico do mês → dia do mês
  - Recorrente → frequência (e dia da semana quando for semanal/quinzenal; dia do mês quando for mensal por dia fixo)
  - Primeiro/último dia do mês → nada mais a exigir
- Mensagens de erro claras apontando o campo que falta.

Aplicar a mesma verificação nos dois lugares que criam automação: a tela de automações e a tela de modelos de automação, para não repetir o problema.

## Detalhe técnico

- `src/components/automations/advanced/ActionConfigForm.tsx` — extrair uma função `validateDateConfig(config)` que devolve a primeira mensagem de erro ou `null` (mantendo o módulo de ações dono da regra).
- `src/components/automations/advanced/AdvancedAutomationBuilder.tsx` (~linha 146) e `src/components/settings/TemplateAutomationDialog.tsx` (~linha 198) — no loop de `configFields`, tratar `field.type === 'date_config'` chamando `validateDateConfig` em vez de checar `actionConfig[field.name]`.
- Nenhuma mudança na execução das automações nem na regra de recorrência.

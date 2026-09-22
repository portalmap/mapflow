# Condições completas e "E / OU" nos gatilhos

Hoje a condição do gatilho só oferece 5 campos (Etiqueta, Prioridade, Responsável, Data de vencimento, Subtarefas) e, quando você escolhe vários gatilhos, o sistema assume sempre "OU" (o rótulo é fixo, não clicável).

## O que muda

### 1. Condições espelhando todos os gatilhos
A lista de campos da condição passa a ter um item para cada gatilho existente, com o mesmo nome usado na lista de gatilhos, agrupado nas mesmas categorias:

- Tarefa criada / adicionada aqui / movida para cá
- Tarefa ou subtarefa atualizada
- Comentário adicionado
- Todas as checklists resolvidas / Todas as subtarefas imediatas resolvidas
- Alterações da data final, Alterações na data de início, Chegada da data de início, Chegada da data final, Data do campo personalizado, A data é antes/depois de, Tempo rastreado
- Alterações de status, Alterações de campo personalizado, Responsável adicionado/removido, Nome alterado, Alterações de prioridade, Etiqueta adicionada/removida, Alterações do tipo de tarefa, Tarefa vinculada, Tarefa desbloqueada

Cada campo ganha operadores e valores adequados (status: é/não é uma das etapas; etiqueta: contém/não contém; responsável: está atribuído/inclui usuário; datas: definida/não definida, antes/depois; nome: contém/não contém texto; prioridade: é/não é; tipo, campo personalizado, checklists, subtarefas, comentários, tempo rastreado, vínculos: comparações equivalentes).

Onde o dado não existe hoje na tarefa para comparar (ex.: "tarefa foi movida para cá"), a condição é avaliada pelo evento que disparou a automação, não inventando dado.

### 2. "E / OU" entre os gatilhos
No bloco de gatilhos, o rótulo fixo "OU" entre gatilhos vira o mesmo par clicável "E / OU" usado nas condições (igual ao terceiro print), com a opção ativa destacada. Também entra no topo do bloco a escolha rápida "Qualquer gatilho" / "Todos os gatilhos".

Significado do "E" (conforme decidido): a automação só dispara se, na mesma alteração, todos os gatilhos ligados por "E" forem satisfeitos — por exemplo, o status mudou **e** o responsável mudou na mesma operação. Sendo "OU", basta qualquer um, como hoje.

### 3. Garantir que E/OU funcione
- A avaliação das condições passa a respeitar a precedência correta: blocos de "E" são resolvidos primeiro e depois combinados pelos "OU" (hoje é uma avaliação em sequência da esquerda para a direita, que dá resultado errado em casos como "A E B OU C").
- A mesma correção vale para as automações de modelos, que reutilizam o mesmo construtor.
- Automações já salvas continuam funcionando; nada precisa ser recriado.

## Detalhes técnicos

- `ConditionRow.tsx`: novo catálogo de campos derivado de `triggerCategories.ts`, tipos ampliados (`field` passa a aceitar os novos identificadores), mapa de operadores por campo, seletores de valor por tipo (status via `useStatuses`, etiquetas, usuários, campos personalizados, texto, número, datas). Select de campo agrupado por categoria.
- `ConditionsBuilder.tsx`: mantém seletor global + conector E/OU (já existentes) e agrupa os itens do select por categoria.
- Novo componente `TriggerLogicToggle` (ou ajuste inline em `AdvancedAutomationBuilder.tsx`) substituindo o badge fixo "OU" por toggle E/OU; estado `triggerLogics: ('AND'|'OR')[]` persistido em `action_config.trigger_logics` ao lado de `or_triggers` (formato retrocompatível: ausente = tudo OU).
- `useStatusChangeAutomations.ts`:
  - `evaluateSingleCondition` ganha os novos campos, usando `TaskData` ampliado (status, name, task_type, start_date, custom fields, checklists, contagem de comentários, tempo rastreado, vínculos) e o contexto do evento disparador quando o campo é de evento.
  - `evaluateConditions` reescrito com precedência E > OU.
  - Filtro de automações passa a checar `trigger_logics`: quando "E", exige que o evento atual satisfaça os demais gatilhos do grupo na mesma alteração (comparando os campos alterados no evento).
- `TemplateAutomationDialog.tsx`: mesmos ajustes de UI de gatilho/condição para paridade.
- Sem alteração de banco de dados; tudo dentro de `action_config`.

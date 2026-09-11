# Aplicar modelos com automações E tarefas

Hoje, quando você usa "Aplicar" a partir de um modelo (em Spaces, Pastas ou Listas), o sistema cria a estrutura que falta e as automações — mas nunca cria as tarefas cadastradas no modelo. Só a criação de um Space novo pelo modelo cria tarefas, e mesmo assim de forma incompleta (sem prazos, etiquetas, tempo estimado, marco e etapa).

## O que vai mudar

1. Toda aplicação de modelo passa a criar também as tarefas do modelo, nos três níveis:
   - modelo de Space aplicado em Spaces;
   - modelo de Pasta aplicado em Pastas;
   - modelo de Lista aplicado em Listas.
2. Tarefa que já existe com o mesmo título na lista de destino não é criada de novo — só entram as que faltam. Nada existente é apagado ou alterado.
3. As tarefas criadas passam a trazer tudo que foi configurado no modelo: descrição, prioridade, data de início e prazo (calculados pelos dias definidos no modelo, a partir do dia da aplicação), tempo estimado, marco, etiquetas e a etapa correspondente do modelo de status.
4. O resultado da aplicação passa a mostrar quantas tarefas foram criadas, junto de "automações aplicadas" e "pastas/listas criadas".
5. Sem automações no modelo continua funcionando: a estrutura e as tarefas são criadas normalmente.

## Detalhes técnicos

Módulo afetado: apenas templates/automações. Nada em Agenda, Chat, Gestão ou notificações.

- Novo utilitário isolado `src/lib/templateTaskApply.ts` com `applyTemplateTasksToLists({ templateId, workspaceId, listIdMap, tasks, statusIdMap, createdByUserId })`:
  - lê `space_template_tasks` do modelo;
  - para cada lista de destino, busca os títulos já existentes em `tasks` (case-insensitive) e ignora duplicados;
  - resolve status: `status_template_item_id` → `statusIdMap` (já construído nos hooks) → status padrão do workspace;
  - calcula `start_date`/`due_date` a partir de `start_date_offset`/`due_date_offset` sobre a data atual;
  - grava `estimated_time`, `is_milestone`, `priority`, `description`, `order_index`;
  - cria/reaproveita etiquetas por nome em `task_tags` e vincula em `task_tag_relations`;
  - retorna `{ tasksCreated, errors }`.
- `src/hooks/useSpaceTemplates.ts`:
  - `useApplyTemplateAutomationsToSpaces` e `useApplyTemplateAutomationsToScopes` chamam o utilitário após criar estrutura/automações, usando os `listIdMap` e `statusIdMap` já calculados; resultados ganham `tasksCreated`.
  - `useApplySpaceTemplate` passa a usar o mesmo utilitário no lugar do insert simplificado atual, para o comportamento ficar idêntico nos dois caminhos.
- `ApplyTemplateAutomationsDialog.tsx` e `ApplyTemplateAutomationsToScopeDialog.tsx`: novo indicador "Tarefas criadas" no resumo, texto do aviso ajustado, e invalidação das queries de tarefas ao final.
- Sem mudanças de banco de dados: `space_template_tasks` já guarda todos os campos necessários.

## Verificação

- Typecheck do projeto.
- Aplicar um modelo de lista em uma lista já usada e confirmar que só tarefas novas aparecem, sem duplicar as existentes.

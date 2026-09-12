# Aplicar template de pasta deve criar as listas que faltam

## O que está acontecendo

Ao aplicar o template de pasta diretamente sobre uma pasta já existente (como "Tarefas & Demandas | Aviões e Músicas - Teste"), o sistema apenas **procura** as listas do modelo pelo nome dentro daquela pasta. Se a lista não existe, ela é simplesmente ignorada — nada é criado, e por consequência as tarefas e automações daquela lista também não são aplicadas.

Hoje a criação de listas faltantes só acontece em outro caminho: quando o usuário marca a opção de criar a estrutura do modelo dentro de Spaces selecionados. Aplicando na pasta, esse caminho não é usado.

## O que será feito

Ao aplicar um template de pasta em uma pasta existente:

1. Comparar as listas do modelo com as listas já existentes naquela pasta (mesma comparação de nome já usada hoje).
2. Criar as listas que estiverem faltando, dentro da pasta selecionada, no Space da pasta, com o nome seguindo o padrão do modelo (nome do modelo + nome do Space, igual à criação atual).
3. Aplicar nelas o modelo de status do modelo, quando houver, para já nascerem com as etapas certas.
4. Incluir essas listas novas no mapeamento, para que as automações e as tarefas do modelo sejam aplicadas nelas também.
5. Listas já existentes continuam intactas: mantêm tarefas e apenas recebem as automações equivalentes substituídas, e tarefas com título repetido continuam não sendo duplicadas.
6. Contar as listas criadas no resumo final ("Pastas/listas criadas").

Nada muda no comportamento de aplicação em Listas nem na criação de estrutura por Space.

## Detalhes técnicos

- Arquivo: `src/hooks/useSpaceTemplates.ts`, mutation `useApplyTemplateAutomationsToScopes`.
- No laço de destinos, quando `targetType === 'folder'`: buscar a pasta (`folders`) para obter `space_id` e o nome do Space; comparar `space_template_lists` com as listas reais via `realMatchesTemplateName`; inserir as faltantes em `lists` com `workspace_id`, `space_id`, `folder_id = targetId`, `name = buildRealName(...)`, `status_template_id`, `status_source`.
- Após inserir, chamar a RPC `sync_template_statuses_for_list` quando houver `status_template_id`, e incrementar `result.structuresCreated`.
- As listas criadas entram em `realLists` antes de montar `listIdMap`/`statusIdMap`, de modo que `applyTemplateTasksToLists` receba o mapeamento completo.
- Módulo isolado: sem alteração em `templateTaskApply.ts`, nos diálogos, nem nos fluxos de Automações independentes.

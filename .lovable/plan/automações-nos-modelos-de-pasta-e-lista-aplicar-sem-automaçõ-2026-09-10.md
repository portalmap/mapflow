# Automações nos modelos de Pasta e Lista + aplicar sem automações

## Situação atual (verificada no código)

- A área de automações dentro do modelo (criar, editar, ligar/desligar, importar) só existe no editor de modelos de **Space**. Os editores de modelo de **Pasta** e de **Lista** não têm essa área.
- O menu de cada modelo já tem "Aplicar automações em Spaces / Pastas / Listas" nos três tipos — o que falta é poder configurar as automações dentro dos modelos de pasta e lista.
- Na janela de aplicar, o botão "Aplicar Automações" fica **desativado** quando o modelo não tem automações habilitadas, mesmo quando a intenção é só criar as pastas/listas do modelo que estão faltando.

## O que será feito

### 1. Automações dentro do modelo de Pasta e de Lista

- A mesma área de automações do modelo de Space passa a aparecer no editor de modelo de Pasta e no de Lista (só depois do modelo estar salvo, como já acontece hoje).
- Nela é possível criar, editar, duplicar, ligar/desligar, excluir e **importar** automações (de um Space/pasta/lista real ou de outro modelo).
- Onde a automação atua fica limitado ao que existe no tipo de modelo:
  - modelo de Pasta: a própria pasta ou uma das listas dentro dela;
  - modelo de Lista: apenas a própria lista.
- Nada muda no modelo de Space: continua com pasta, lista e espaço inteiro.

### 2. Aplicar mesmo sem automações

- O botão "Aplicar" deixa de ficar travado quando o modelo não tem automações.
- Se não houver automações, a aplicação segue normalmente: as pastas/listas do modelo que estiverem faltando são criadas (quando essa opção estiver marcada) com as etapas do modelo, e as existentes ficam intactas.
- O aviso continua aparecendo, mas como informação ("este modelo não tem automações"), não como bloqueio. O resumo final mostra o que foi criado, mesmo com zero automações.
- Se nada estiver selecionado, o botão continua desativado (não há destino).

## Detalhes técnicos

- `FolderTemplateEditor.tsx` e `ListTemplateEditor.tsx`: renderizar `TemplateAutomationsSection` quando `templateId` existir, passando `template.folders` / `template.lists` já carregados.
- `TemplateAutomationsSection.tsx` e `TemplateAutomationDialog.tsx`: nova prop opcional `allowedScopes` (`['space','folder','list']` por padrão; `['folder','list']` no modelo de pasta; `['list']` no modelo de lista) para filtrar o seletor de escopo e pré-selecionar o escopo único quando houver só um. Nenhuma mudança de comportamento no caminho atual do Space.
- `ApplyTemplateAutomationsToScopeDialog.tsx`: remover `enabledAutomationsCount === 0` da condição de `disabled`; transformar o `Alert` em aviso informativo; texto de estimativa só quando houver automações.
- `ApplyTemplateAutomationsDialog.tsx` (Spaces): mesmo tratamento de aviso informativo, sem travar o botão.
- `useApplyTemplateAutomationsToScopes` / `useApplyTemplateAutomationsToSpaces` em `useSpaceTemplates.ts`: garantir retorno de sucesso com `automationsCreated = 0` quando o modelo não tem automações (sem erro/toast vermelho); a criação de estrutura faltante continua igual.
- Sem migração de banco: `space_template_automations` já guarda `scope_type`, `folder_ref_id` e `list_ref_id` para qualquer tipo de modelo.
- Modularidade: as mudanças ficam contidas na camada de templates/automações de template; automações reais em execução, status, chat e agenda não são tocados.

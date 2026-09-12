# Separar Templates e Modelos de Automação

## Resultado esperado

### Templates
- Continuam organizados por **Space, Pasta e Lista**.
- Podem criar uma estrutura nova ou complementar uma estrutura existente.
- Aplicam pastas, listas, tarefas, etapas e automações configuradas no Template.
- Continuam funcionando mesmo sem nenhuma automação.
- Não aparecem mais na aba **Automações**.

### Automações
- Passam a ter modelos próprios e independentes, sem pastas, listas ou tarefas vinculadas.
- Cada modelo será de um único tipo: **Space**, **Pasta** ou **Lista**.
- Um modelo poderá ser aplicado a vários destinos compatíveis.
- A aplicação cria ou substitui somente automações; nunca cria estrutura ou tarefas.
- Terão ações próprias de criar, editar, renomear, duplicar, excluir, ativar/desativar regras e aplicar em massa.

## Migração dos modelos atuais

- Manter as automações atuais dentro dos Templates, preservando integralmente o comportamento existente.
- Copiar essas automações para a nova área independente.
- Quando um Template tiver regras de níveis diferentes, gerar modelos separados por tipo, por exemplo:
  - `MAP | Tarefas & Demandas — Spaces`
  - `MAP | Tarefas & Demandas — Pastas`
  - `MAP | Tarefas & Demandas — Listas`
- A cópia será idempotente: executar novamente não criará modelos repetidos.
- Nenhum Space, Pasta, Lista, tarefa ou automação já aplicada será alterado.

## Experiência nas telas

1. Na aba **Templates**, trocar textos como “Aplicar automações” por **Aplicar Template**, deixando claro que estrutura, tarefas e automações serão complementadas.
2. Na aba **Automações**, substituir a listagem atual de Templates por modelos exclusivos de automação.
3. Adicionar filtros por **Spaces**, **Pastas** e **Listas** e botão **Criar modelo de automação**.
4. Na edição, mostrar somente as regras daquele tipo e impedir referências a níveis incompatíveis.
5. Na aplicação, permitir busca, seleção individual e seleção em massa apenas de destinos do tipo do modelo.
6. Exibir um resumo final com destinos processados, automações criadas, substituídas e erros, sem contadores de estrutura ou tarefas.

## Regras de aplicação

- Regras equivalentes no destino serão substituídas para evitar duplicidade; as demais permanecerão intactas.
- Somente regras habilitadas serão aplicadas.
- Campos que dependem do destino, como etapa, lista de movimentação, equipe, usuário ou etiqueta, serão validados e remapeados antes da aplicação.
- Quando uma referência não puder ser resolvida, a regra afetada será ignorada e informada no resumo, sem interromper os demais destinos.
- As permissões seguirão o padrão administrativo já usado para gerenciar automações reais no workspace.

## Implementação modular

- Criar entidades próprias para **modelos de automação** e suas **regras**, sem reaproveitar registros de Templates estruturais.
- Manter `space_template_automations` exclusivamente para as automações incluídas em Templates.
- Criar hooks e serviços isolados para cadastro, duplicação, exclusão, cópia inicial e aplicação dos modelos de automação.
- Reaproveitar apenas o editor de gatilhos, condições e ações, além do remapeamento seguro de configurações.
- Separar os diálogos de aplicação: o fluxo de Templates continua criando/complementando tudo; o fluxo de Automações trabalha somente com automações.
- Aplicar regras de acesso no banco para leitura por membros e gerenciamento pelos administradores autorizados.

## Banco de dados

- Criar uma tabela para os modelos independentes, com nome, descrição, tipo, workspace e criador.
- Criar uma tabela para as regras pertencentes a esses modelos, com gatilho, ações, condições, configuração e estado habilitado.
- Adicionar índices, atualização automática de data, permissões e proteção por workspace.
- Após a estrutura estar disponível, copiar os dados atuais em uma operação separada e segura, agrupando-os por Template e tipo.

## Verificação

- Confirmar que Templates existentes continuam criando e complementando estrutura, tarefas e automações.
- Confirmar que a aba Automações não lista mais registros da aba Templates.
- Validar criação, edição, duplicação, exclusão e aplicação em massa para cada tipo.
- Repetir a cópia inicial e confirmar que nenhum modelo é duplicado.
- Testar referências válidas e ausentes, substituição de regras equivalentes e isolamento entre workspaces.
- Executar verificação de tipos e testar visualmente a página de Configurações em tela ampla e móvel.
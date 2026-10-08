# Corrigir automação “Criada E depois alterada para Blog”

## Diagnóstico confirmado

A automação está ativa e configurada corretamente para:

- tarefa ou subtarefa criada;
- **E** alteração de status para **Blog**;
- adicionar a etiqueta **Blog**.

A tarefa do print foi criada às 09:57:53 e alterada para Blog às 09:58:17. A etiqueta não foi adicionada e não houve registro de execução.

Hoje, o módulo só relaciona gatilhos unidos por **E** durante uma janela temporária de 8 segundos, mantida apenas na tela aberta. Além disso, a criação da tarefa não é registrada nesse controle. Assim, “criada E depois alterada para Blog” nunca fica completo da forma esperada.

## Implementação

1. **Tornar o gatilho de criação persistente**
   - Reconhecer pela própria tarefa e pelo histórico que ela foi criada, sem depender de uma janela de 8 segundos.
   - Ao ocorrer a mudança para Blog, considerar atendido o primeiro gatilho e executar a ação.
   - Manter **OU** com o comportamento atual e preservar compatibilidade com automações antigas.

2. **Centralizar a avaliação dentro do módulo de automações**
   - Criar uma avaliação modular para gatilhos de evento, separando fatos persistentes, como “tarefa criada”, de eventos instantâneos, como “status alterado”.
   - Não alterar diretamente Agenda, Chat, Documentos ou outros módulos.

3. **Fortalecer a ação de etiqueta**
   - Adicionar a etiqueta sem duplicar relações existentes.
   - Verificar e registrar erros de gravação em vez de ignorá-los silenciosamente.
   - Atualizar imediatamente a tarefa na tela após a execução.

4. **Registrar a execução corretamente**
   - Criar o registro de execução somente quando a regra estiver completa e a ação for aplicada com sucesso.
   - Evitar que a mesma mudança de status execute a automação duas vezes.

5. **Validar o fluxo real**
   - Criar uma tarefa em outro status, aguardar mais de 8 segundos e alterá-la para Blog.
   - Confirmar que a etiqueta Blog aparece sem atualizar a página.
   - Confirmar o registro da execução e testar que a regra não dispara em outro status.
   - Reprocessar de forma controlada a tarefa “teste” mostrada no print, sem duplicar etiqueta ou execução.

## Detalhes técnicos

- Ajustar o avaliador em `useStatusChangeAutomations.ts` para resolver antecedentes persistentes pelo estado/histórico da tarefa.
- Manter `trigger_logics` como fonte da relação **E/OU** e `or_triggers` para compatibilidade.
- Substituir o `upsert` silencioso da etiqueta por uma operação idempotente com tratamento explícito de erro.
- Cobrir o cenário com teste focado no módulo de automações e validar a página `/automations` e a tarefa afetada.

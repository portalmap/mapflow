# Gestão: controle de tempo de uso do Flow

Novo relatório dentro do módulo Gestão (aba "Tempo no Flow"), medindo todas as pessoas do sistema. A visibilidade continua restrita a administradores globais e às pessoas convidadas nas configurações da Gestão.

## Como a medição funciona

- Enquanto a pessoa está com o Flow aberto, o sistema envia um sinal de presença a cada 1 minuto.
- **Online ativo**: houve clique, digitação, rolagem ou movimento de mouse nos últimos **3 minutos**.
- **Online inativo**: o Flow está aberto (inclusive em segundo plano ou aba escondida), mas sem interação há mais de 3 minutos.
- **Offline**: sem nenhum sinal de presença — a pessoa fechou o Flow, perdeu a conexão ou desligou o computador. O tempo offline é o restante do período analisado.
- Cada bloco de presença é gravado como um "período de uso" com início, fim, tipo (ativo/inativo) e o dia a que pertence. Se a pessoa fechar sem avisar, o período fecha automaticamente no último sinal recebido.

## O que o relatório mostra

Filtros: período (hoje, 7 dias, 30 dias, mês atual, intervalo personalizado) e busca por pessoa.

Por pessoa, na tabela:
- Tempo online ativo, tempo online inativo, tempo offline no período
- Último acesso (data/hora e "há quanto tempo")
- Dias com acesso no período e frequência (dias por semana)
- Média de tempo por dia de uso e média por sessão
- Quantidade de sessões

Visões complementares:
- Cartões de resumo da equipe (total ativo, total inativo, média por pessoa, pessoas sem acesso no período)
- Detalhe da pessoa: linha do tempo por dia com ativo/inativo, e frequência por semana e por mês
- Exportação em CSV, igual aos outros relatórios da Gestão
- Atualização automática enquanto a aba está aberta, mais botão "Atualizar"

## Detalhes técnicos

Banco (migration, módulo isolado — nada existente é alterado):
- `public.user_activity_sessions`: `user_id`, `started_at`, `last_seen_at`, `ended_at`, `state` ('active' | 'idle'), `day` (date, fuso America/Sao_Paulo), `user_agent`, `created_at`, `updated_at`; índices por `(user_id, started_at)` e `(day)`.
- GRANTs para `authenticated` (insert/select/update das próprias linhas) e `service_role`; RLS: cada pessoa grava/lê só as suas linhas; leitura ampla apenas via RPC `security definer` protegida por `public.can_access_management(auth.uid())`.
- RPCs: `public.get_flow_usage_report(_from, _to)` (agregados por pessoa: ativo, inativo, sessões, dias, último acesso, médias) e `public.get_flow_usage_details(_user_id, _from, _to)` (por dia/semana/mês). O tempo offline é calculado como o período menos ativo/inativo.
- Encerramento de sessões abandonadas dentro das RPCs: sessão sem `ended_at` e com `last_seen_at` > 5 min é tratada como terminada em `last_seen_at`.

Frontend:
- `src/hooks/useActivityTracker.ts`: escuta `pointerdown`, `keydown`, `scroll`, `visibilitychange`; heartbeat de 60s via server function; troca de `active`/`idle` com limite de 3 min; encerra no `pagehide`.
- Montado uma única vez em `src/routes/__root.tsx` (apenas com sessão ativa), para valer em todas as páginas.
- `src/lib/activity.functions.ts`: `pingActivity` e `endActivitySession` com `requireSupabaseAuth`; `getFlowUsageReport` / `getFlowUsageDetails` chamando as RPCs.
- `src/hooks/useFlowUsage.ts` e `src/components/gestao/FlowUsageReport.tsx` (tabela, cartões, detalhe e CSV), com nova aba em `src/page-views/Gestao.tsx`.
- Sem alterações em Agenda, tarefas, chat ou nos relatórios de reuniões.

## Verificação

1. Navegar pelo Flow e conferir que aparece tempo ativo; deixar parado 3+ min e ver o tempo migrar para inativo.
2. Fechar a aba e confirmar que o último acesso e o fim da sessão ficam corretos.
3. Conferir totais, frequência e médias no período e a exportação em CSV.
4. Confirmar que quem não tem acesso à Gestão não vê o relatório.

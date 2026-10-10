# Logout pelo Hub — verificação e complementos

## Situação atual

| Item | Status | Observação |
|---|---|---|
| 1. Verificação de sessão pelo servidor | Já implementado | Função `session-guard` chama `{HUB_BASE_URL}/api/public/session-status` com `SSO_CLIENT_SECRET`, timeout 3s, não desloga em erro, roda ao abrir e a cada 30 min. Precisa de ajustes (abaixo). |
| 2. Aviso em tempo real (broadcast) | Já implementado | Canal `session-revocations`, evento `revoked`, compara SHA-256 do e-mail. As chaves do Hub já foram corrigidas hoje. Precisa de ajustes pequenos. |
| 3. Relay `usuario.atualizado` com `acesso_ativo=false` | Não implementado | A caixa de entrada não trata esse assunto hoje (cai em "modo inválido"). |

## O que será feito

### 1. Verificação de sessão (ajustes)
- Enviar `app_slug: "mapflow"` (hoje usa o secret `APP_SLUG`, padrão `map-flow`). Será usado um valor próprio para o Hub, sem mudar o usado no login SSO.
- E-mail sempre em minúsculas e sem espaços.
- Tratar 400/429/500 e timeout como "seguir normalmente" (já é assim; manter explícito).
- Evitar chamadas repetidas: não rodar de novo se a última verificação foi há menos de 1 minuto (protege o limite de 60/min por IP quando várias abas abrem juntas).
- Também deslogar se o próprio sistema tiver marcado o acesso como bloqueado (item 3).

### 2. Aviso em tempo real (ajustes)
- Normalizar o e-mail com `trim()` antes do SHA-256.
- Se o aviso trouxer `app_slug` e ele for de outro sistema, ignorar; sem `app_slug`, vale para todos.
- Manter a regra atual: só desloga se `revoked_at` for depois do login neste sistema.

### 3. Relay `usuario.atualizado` (novo)
- Na caixa de entrada, aceitar o assunto `usuario.atualizado` vindo de origem `hub`, identificando o usuário pelo e-mail.
- `acesso_ativo=false`:
  - marcar o acesso como bloqueado com data/hora;
  - bloquear o usuário no login deste sistema, o que invalida a renovação da sessão;
  - o navegador do usuário recebe o aviso na hora e é deslogado e levado ao login.
- `acesso_ativo=true`: retirar o bloqueio (permite logar de novo pelo Hub).
- Registrar no log de diagnóstico do Relay, sem alterar os outros assuntos.

## Detalhes técnicos
- Banco: nova coluna `access_revoked_at` em `session_context` + publicação realtime dessa tabela (RLS existente: usuário só lê a própria linha — confirmar e ajustar se preciso).
- `hub-inbox`: novo handler isolado `handleUsuarioAtualizado`; usa `auth.admin.updateUserById(id, { ban_duration: "876000h" | "none" })`.
- `sso-exchange`: ao logar com sucesso, limpar `access_revoked_at` só se o usuário não estiver bloqueado.
- `session-guard`: novo secret opcional `HUB_APP_SLUG` (padrão `mapflow`); retorna `logout` com motivo `access_disabled` se `access_revoked_at > login_at`.
- Front (`AuthContext`): assinatura realtime na própria linha de `session_context`; mensagem "Seu acesso foi desativado." Ajustes em `hubRevocationChannel.ts` (filtro `app_slug`) e `useSessionGuard.ts` (intervalo mínimo).
- Módulos isolados: cada mudança fica no seu arquivo; os outros assuntos do Relay não são tocados.

## Ponto a confirmar
O payload do `usuario.atualizado` deve trazer o `email` do usuário. Se vier outro identificador (ex.: id do Hub), será usado `profiles.hub_user_id`.

---

# Remover o fluxo de convites

## Situação atual
- Não existe mais botão, menu ou tela de aceite de convite no sistema.
- Restos: as funções de backend `send-invitation-email` (gera o link `.../accept-invite/...`) e `add-user-with-invite` (cria usuário e manda e-mail), que nenhuma tela chama; a tabela `user_invitations` e a rotina `expire_old_invitations`; e o texto da tela de Membros: "Use a aba Convites para adicionar novos membros" (essa aba não existe).
- Não existe hoje uma forma de adicionar alguém a um workspace pela tela; dá só para mudar o papel ou remover.
- Os "convidados" da Agenda são os participantes dos compromissos do Google e não fazem parte disso. Eles não serão tocados.

## O que será feito
1. Excluir do backend as funções `send-invitation-email` e `add-user-with-invite` e retirá-las da configuração.
2. Remover do banco a tabela `user_invitations` e a rotina `expire_old_invitations`. Antes, confirmar que nada mais depende delas.
3. Trocar o texto da tela de Membros e incluir o botão **"Liberar acesso"**. O administrador escolhe uma pessoa que já entrou pelo Hub, escolhe o papel e confirma. A pessoa entra direto no workspace, sem e-mail e sem link.
4. Só administradores do workspace e proprietários globais podem liberar acesso. A regra fica garantida no banco, não só na tela.
5. Atualizar `docs/INTEGRATIONS.md` e anotar a tarefa na lista de tarefas.

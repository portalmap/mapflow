# Encerrar o acesso quando o Hub revogar a sessão

## 1. Como está hoje (análise, nada foi alterado)

| O que é | Endereço | Onde fica guardado |
|---|---|---|
| Login SSO (tela do Hub) | https://hub.assessoriamap.com.br/sso/login | Configuração do app (`VITE_HUB_BASE_URL`) |
| Troca de código do login | https://hub.assessoriamap.com.br/api/public/sso-redeem | Secret `HUB_SSO_REDEEM_URL` |
| Verificação de sessão e relatório de segurança | https://hub.assessoriamap.com.br/api/public/session-status e /security-report | Secret `HUB_BASE_URL` |
| Relay (envio para o Hub) | https://hub.assessoriamap.com.br | Secret `HUB_RELAY_URL` + `HUB_RELAY_TOKEN` |
| Caixa de entrada (o Hub chama aqui) | função `hub-inbox` deste sistema | Protegida pelo secret `HUB_INBOX_TOKEN` |
| Aviso em tempo real do Hub | https://sdhwzcxtsorzzmdtwuff.supabase.co | Configuração do app (`VITE_HUB_SUPABASE_URL` + chave pública do Hub) |

**Domínios aceitos pelo login hoje:** flow.assessoriamap.com.br, mapflow.lovable.app, todos *.lovable.app e *.lovableproject.com, localhost, mais o que estiver no secret `ALLOWED_ORIGINS`. O `<DOMINIO>` da sua mensagem veio sem preencher: se for outro endereço, ele precisa entrar em `ALLOWED_ORIGINS`.

**O que já funciona:**
- Verificação pelo servidor ao abrir o sistema e a cada 30 minutos, que nunca desloga em caso de erro.
- Conexão ao aviso em tempo real do Hub (canal "session-revocations").

**O que falta:**
- O nome do sistema enviado ao Hub hoje é "map-flow". Você escreveu `<APP_SLUG>` sem preencher. Vou usar **"mapflow"**, como no pedido anterior, salvo se você indicar outro.
- O limite de 3 segundos na consulta ao Hub precisa ser confirmado e garantido.
- O e-mail precisa estar sempre em minúsculas e sem espaços, tanto na consulta quanto no aviso em tempo real.
- O aviso em tempo real ainda não ignora avisos destinados a outros sistemas e ainda não compara o horário com o do login.
- Ao receber o aviso "usuario.atualizado" com acesso desativado, a caixa de entrada ainda não faz nada.
- Ao deslogar, o sistema precisa mandar a pessoa para o login do Hub.
- Ainda não há atualização de nome/foto/papel em tempo real (é opcional).

## 2. O que vou fazer depois que você aprovar

a) **Verificação no servidor:** enviar `app_slug` = "mapflow" e o e-mail normalizado, com limite fixo de 3 s. Erro, excesso de chamadas (429) ou demora nunca deslogam. Se o próprio sistema tiver marcado o acesso como desativado (item d), a verificação desloga.

b) **No navegador:** manter a verificação ao abrir e a cada 30 min. Se a resposta for "deslogar", encerrar a sessão e ir para o login do Hub.

c) **Tempo real:** deslogar na hora só se o aviso for desta pessoa, valer para este sistema (sem nome de sistema ou com "mapflow") e for posterior ao login. Opcional: ouvir "user-updates" e recarregar nome, foto e papel.

d) **Caixa de entrada:** novo tratamento isolado de "usuario.atualizado" (origem "hub"). Com `acesso_ativo=false`, registrar a desativação com data/hora; a verificação e o tempo real derrubam a sessão. Com `acesso_ativo=true`, retirar o bloqueio. Um novo login bem-sucedido também retira o bloqueio.

e) **Domínios antigos:** continuam funcionando. Vou pedir para você conferir ou atualizar os secrets `APP_SLUG` (= mapflow), `HUB_BASE_URL` e, se houver outro domínio, `ALLOWED_ORIGINS`.

Tudo isso fica no módulo de sessão/SSO. O login atual e as outras telas não mudam.

## Detalhes técnicos
- `supabase/functions/session-guard`: `AbortController` de 3 s em `postHub`; `email.trim().toLowerCase()`; ler `session_context.access_revoked_at` e retornar `logout/access_disabled` se for maior que `login_at`.
- Migração: coluna `access_revoked_at timestamptz` em `session_context` e inclusão na publicação realtime. O front assina a própria linha.
- `src/lib/hubRevocationChannel.ts`: tipar `app_slug`, filtrar por slug e incluir canal opcional `user-updates`. Hash SHA-256 hex do e-mail normalizado em `useSessionGuard`/AuthContext; comparar `revoked_at` com o login.
- `hub-inbox`: handler `handleUsuarioAtualizado` separado.
- `sso-exchange`: zerar `access_revoked_at` no login bem-sucedido.
- O redirecionamento de logout vai para `/sso/login`, que leva ao Hub.

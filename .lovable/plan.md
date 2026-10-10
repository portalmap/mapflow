# Diagnóstico de endereços externos — migração de domínios

Nada foi alterado. Hub novo: `https://hub.assessoriamap.com.br`. MAP Flow novo: `https://<NOVO_DOMINIO>`. Domínio personalizado já ligado ao MAP Flow hoje: `https://flow.assessoriamap.com.br`.

## Tabela

| # | Variável / arquivo | Valor atual | Tipo | Onde é usado |
|---|---|---|---|---|
| 1 | `VITE_HUB_BASE_URL` (.env) | `https://map-hub-flow.lovable.app` | Variável de ambiente (navegador) | `src/routes/sso.login.tsx` → redireciona para `{HUB}/sso/login?app=map-flow&redirect=...` |
| 1 | `HUB_SSO_REDEEM_URL` | (secret, valor oculto) | Secret | `supabase/functions/sso-exchange` → POST de troca do código (sso-redeem) |
| 1/4 | `HUB_BASE_URL` | (secret, valor oculto) | Secret | `session-guard` → `{HUB}/api/public/session-status` e `/api/public/security-report`; `report-refresh-reuse` → `/api/public/security-report` |
| 2 | Callback SSO | `${window.location.origin}/sso/callback` | Dinâmico (domínio atual do navegador) | `sso.login.tsx`; o Hub precisa ter cada domínio na lista de callbacks permitidos |
| 3 | `HUB_RELAY_URL` | (secret, valor oculto) | Secret | `relay-test-send` → `{HUB}/api/public/relay` (envio) e `/api/public/relay-query` (consulta). Catálogo: não existe chamada no código |
| 3 | `HUB_RELAY_TOKEN` | (secret) | Secret | Autenticação do Relay |
| 3 | Caixa de entrada (Hub chama) | `https://efqnscrnyyyjpswctahq.supabase.co/functions/v1/hub-inbox` | Endereço do backend, não depende do domínio do site | `hub-inbox`, protegido por `HUB_INBOX_TOKEN` |
| 4 | `VITE_HUB_SUPABASE_URL` (.env) | `https://map-hub-flow.lovable.app` | Variável de ambiente | `src/lib/hubRevocationChannel.ts` (canal Realtime `session-revocations`) |
| 4 | `VITE_HUB_ANON_KEY` (.env) | chave do projeto `efqnscrnyyyjpswctahq` (deste sistema) | Variável de ambiente | mesmo arquivo |
| 5 | `src/lib/googleCalendarSync.server.ts:1154` | `https://mapflow.lovable.app/api/public/google-calendar/webhook` | Fixo no código | Endereço que o Google chama ao mudar a agenda |
| 5 | `supabase/functions/sso-exchange` (CORS) | `mapflow.lovable.app` + `*.lovable.app` + `*.lovableproject.com` | Fixo no código | Origens permitidas |
| 5 | `src/integrations/supabase/previewAuthStorage.ts` | zonas de preview Lovable | Fixo (só preview) | Não afeta produção |
| 5 | `src/routes/__root.tsx:110-111` | imagem de compartilhamento em `r2.dev` (preview antigo) | Fixo | og:image / twitter:image |
| 5 | `docs/INTEGRATIONS.md:435-436` | callbacks `mapflow.lovable.app` | Documentação | Só referência |
| 6 | Site URL / Redirect URLs do Auth | Não verificável daqui (Supabase externo) | Painel Supabase | Login usa magic link via `sso-exchange` com `redirect_to` vindo do navegador |
| 6 | `send-invitation-email` | `SUPABASE_URL` trocando `https://` por `https://app.` → `https://app.efqnscrnyyyjpswctahq.supabase.co/accept-invite/...` | Fixo/derivado | Link de convite — endereço inválido hoje (e a tela de convite foi removida) |
| 6 | `reset-user-password`, `add-user-with-invite` | sem link de domínio | — | Não geram URL do site |
| 7 | CORS `hub-inbox` | localhost, `*.lovable.app`, `*.lovableproject.com` | Fixo | Origem ausente (servidor-servidor) sempre aceita |
| 7 | CORS `session-guard`, `report-refresh-reuse` | localhost, `*.lovable.app` | Fixo | Chamados pelo navegador do usuário |
| 7 | CORS `get-user-emails`, `migrate-helper`, `add-user-with-invite`, `update-user-email`, `transcribe-audio`, `relay-test-send` | `*` | Fixo | Aceita qualquer origem |
| 7 | CSP / frame-ancestors | Não existe | — | — |

## Problemas encontrados

1. **CORS já quebraria hoje no domínio `flow.assessoriamap.com.br`**: `session-guard`, `report-refresh-reuse` e `sso-exchange` só aceitam `*.lovable.app`. O login SSO e a verificação de sessão falham nesse domínio.
2. **Canal Realtime do Hub mal configurado**: `VITE_HUB_SUPABASE_URL` aponta para o site do Hub (não para o backend Supabase do Hub) e `VITE_HUB_ANON_KEY` é a chave deste sistema. A revogação ao vivo não funciona hoje.
3. **Webhook do Google fixo** em `mapflow.lovable.app`.
4. **Link de convite** gera endereço inválido.

## O que mudar (mantendo os antigos funcionando)

1. **Hub**: trocar `VITE_HUB_BASE_URL`, `HUB_BASE_URL`, `HUB_SSO_REDEEM_URL` e `HUB_RELAY_URL` para `https://hub.assessoriamap.com.br` (+ caminhos). O antigo continua funcionando enquanto o Hub mantiver `map-hub-flow.lovable.app` ativo.
2. **Realtime**: `VITE_HUB_SUPABASE_URL` = `https://<ref-do-hub>.supabase.co` e `VITE_HUB_ANON_KEY` = chave pública do Hub (pedir ao Hub). Não muda com domínio.
3. **CORS**: criar uma lista única de origens permitidas (secret `ALLOWED_ORIGINS`) com `mapflow.lovable.app`, `flow.assessoriamap.com.br`, `<NOVO_DOMINIO>` e mantendo `*.lovable.app`/localhost, aplicada em `sso-exchange`, `session-guard`, `report-refresh-reuse` e `hub-inbox`.
4. **Webhook Google**: trocar o endereço fixo por variável (`PUBLIC_APP_URL`), apontando para o domínio principal; canais antigos expiram em até 7 dias e são renovados ao abrir a Agenda.
5. **No Hub**: cadastrar `https://<NOVO_DOMINIO>/sso/callback` e `https://flow.assessoriamap.com.br/sso/callback`, mantendo `https://mapflow.lovable.app/sso/callback`.
6. **Supabase Auth (painel)**: Site URL = novo domínio; Redirect URLs com todos os domínios (`/**`), incluindo os antigos.
7. **Caixa de entrada**: nada muda (endereço do backend). Só manter `HUB_INBOX_TOKEN` igual no Hub novo.
8. **Opcional**: corrigir link de convite e a imagem de compartilhamento; atualizar `docs/INTEGRATIONS.md`.

Ao aprovar, aplico os itens 3, 4 e 8 no código; os itens 1, 2, 5 e 6 dependem de você informar valores ou ajustar no Hub/painel.

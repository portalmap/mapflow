# Nome e foto vindos do Hub

## O que os dados mostram hoje

Consultei os 16 perfis do MAP Flow:

- Todos os 16 têm nome preenchido.
- 11 têm foto salva aqui (no armazenamento interno, com endereço de validade longa).
- 5 estão sem foto nenhuma — entre eles `marketing@monvizo.com.br`, que entrou hoje às 13:51.

Ou seja: o nome chega no login (o perfil desse usuário foi atualizado no momento do acesso),
mas a foto não está sendo copiada para esses 5. O motivo mais provável é a condição usada hoje
na cópia da foto: ela só roda quando o Hub envia **os dois** dados juntos (o endereço da imagem
E o caminho interno dela). Se o Hub mandar só o endereço da imagem — ou usar outro nome de campo —
a cópia é silenciosamente ignorada. Isso ainda não está confirmado, porque não há registros de
log guardados do login; confirmar isso é o primeiro passo do plano.

Sobre "já alterei o nome": a atualização do nome só acontece no próximo login SSO do próprio
usuário. Não existe hoje nenhuma forma de puxar nome/foto do Hub sem esse novo login.

## Plano

1. **Enxergar o que o Hub manda.** Registrar no login, sem dados sensíveis, quais campos vieram
   do Hub para nome e foto (só os nomes dos campos e se vieram vazios). Assim a causa deixa de ser
   suposição.
2. **Aceitar as variações de campo.** Ler o nome de `nome`, `name`, `full_name` ou `nome_completo`
   e a foto de `avatar_url`, `avatar`, `foto_url`, `photo_url` ou `picture`, usando o primeiro
   preenchido.
3. **Copiar a foto mesmo sem o caminho interno.** Quando o Hub enviar apenas o endereço da imagem,
   a foto passa a ser baixada e guardada aqui igualmente (o controle de repetição passa a usar o
   próprio endereço de origem). Regras mantidas: foto enviada manualmente aqui (`local`) nunca é
   sobrescrita, imagem precisa ser imagem e ter até 5 MB, e falha de foto nunca bloqueia o login.
4. **Atualizar nome e foto de todos sob demanda.** O botão que já existe em Configurações →
   Usuários passa a fazer uma sincronização completa: para cada perfil com `hub_user_id`, busca
   nome e foto atuais no Hub e grava aqui. Isso resolve os perfis já criados sem precisar que cada
   pessoa entre de novo. Depende de o Hub expor uma consulta de usuário por id — se não expuser,
   entrego os itens 1 a 3 e digo exatamente qual endpoint o Hub precisa publicar.
5. **Conferência.** Rodar a sincronização, conferir na lista de usuários que os 5 perfis passaram a
   ter foto (ou confirmar, com o log do item 1, que o Hub realmente não tem foto para eles) e que o
   nome alterado no Hub aparece aqui.

## Detalhes técnicos

- `supabase/functions/sso-exchange/index.ts`: normalização dos campos do Hub, log dos campos
  recebidos, cópia da foto quando só houver `avatar_url` (chave de idempotência = URL de origem
  normalizada, guardada em `avatar_path` quando o Hub não fornecer caminho).
- `src/lib/avatar-sync.server.ts`: nova função `resyncProfilesFromHub` (nome + foto por
  `hub_user_id`), reaproveitando `copyRemoteAvatar`.
- `src/lib/avatar-backfill.functions.ts`: mantém a checagem de permissão atual
  (global_owner / owner / admin) e passa a chamar a sincronização completa.
- `src/components/settings/UserManagement.tsx`: apenas rótulo/toast do botão existente
  ("Sincronizar do Hub", com contagem de nomes e fotos atualizados).
- Escopo isolado ao módulo de identidade/avatar: nenhuma alteração de schema e nenhum outro
  módulo afetado.

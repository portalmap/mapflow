# Apagar as funções de convite e conferir o código

## O que será feito
1. Apagar do servidor as duas funções de convite que ainda estão ativas:
   - `send-invitation-email` (criava o convite e gerava o link `.../accept-invite/...`)
   - `add-user-with-invite` (criava o usuário e enviava o e-mail com link)
2. Remover as duas pastas correspondentes em `supabase/functions/` para elas não serem republicadas.
3. Atualizar `roadmap.md`: marcar "Apagar as funções antigas de convite" como concluído.
4. Conferir o código inteiro (busca por `invit`, `convite`, `accept-invite`, `user_invitations`) e reportar o que sobrou.

## O que já foi conferido
- Nenhuma tela, rota ou hook chama essas duas funções (busca em `src/` sem resultados).
- A tabela `user_invitations` já foi apagada na migração anterior.
- Referências que continuam e NÃO são do fluxo de convites do workspace: convidados de compromissos da Agenda/Google Calendar (`invite_status`, `invited_at`, `guests_can_invite_others`, "convidados" nos eventos). Isso é da Agenda e fica como está.
- Documentação (`docs/PADROES-TELAS-ADMIN-MAPFLOW.md`) só cita que os convites foram removidos; fica.

## Detalhes técnicos
- Apagar via ferramenta de exclusão de Edge Functions no Supabase, depois `rm -rf` das duas pastas.
- Nenhuma mudança em banco ou em outros módulos (módulo de Membros/Workspace e Agenda permanecem intactos).
- Verificação final: `rg` por termos de convite e `supabase/functions` listando só as funções restantes.

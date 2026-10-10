# Remover o fluxo de convites

## Situação atual
- Não existe mais botão, menu nem tela de aceite de convite no sistema.
- Restos encontrados:
  - as funções de servidor `send-invitation-email`, que gera o link `.../accept-invite/...`, e `add-user-with-invite`, que cria o usuário e manda o e-mail. Nenhuma tela as chama hoje;
  - a tabela de convites `user_invitations` e a rotina `expire_old_invitations`;
  - na tela de Membros, o texto "Use a aba Convites para adicionar novos membros", mas essa aba não existe.
- Hoje não há como adicionar alguém a um workspace pela tela. Só é possível mudar o papel ou remover.
- Os "convidados" da Agenda são os participantes dos compromissos do Google. Eles não fazem parte disto e não serão tocados.

## O que será feito
1. Excluir as funções `send-invitation-email` e `add-user-with-invite` do servidor e da configuração.
2. Apagar do banco a tabela `user_invitations` e a rotina `expire_old_invitations`, depois de confirmar que nada mais depende delas.
3. Na tela de Membros, trocar o texto e incluir o botão **"Liberar acesso"**. O administrador escolhe uma pessoa já cadastrada (quem já entrou pelo Hub) e o papel. A pessoa passa a ver o workspace na hora, sem e-mail nem link.
4. Só administradores do workspace e proprietários globais podem liberar acesso. Essa regra também fica garantida no banco.
5. Atualizar `docs/INTEGRATIONS.md` e a lista de tarefas.

## Detalhes técnicos
- A gravação em `workspace_members` usa as permissões já existentes. Antes, conferir se a política de inclusão aceita administradores; se não aceitar, ajustar a política.
- Para a lista de pessoas, usar `get_all_users_with_emails` ou `profiles`, sem mostrar quem já é membro.
- Mudanças só no módulo de Membros do workspace.

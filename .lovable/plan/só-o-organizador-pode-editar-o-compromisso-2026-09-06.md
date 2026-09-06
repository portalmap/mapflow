# Só o organizador pode editar o compromisso

Hoje, um compromisso do Google aparece com "Editar" e "Excluir" para você mesmo quando outra pessoa o criou — basta o Google marcar "convidados podem modificar o evento". Vamos alinhar ao que você pediu: **editar e excluir só para quem organizou**.

## O que muda

- Compromissos vindos do Google: os botões **Editar** e **Excluir** aparecem apenas quando você é o organizador. Para os demais, fica só a leitura e o "Você vai participar?" (Sim / Não / Talvez), que continua gravando a sua resposta no Google.
- A permissão "convidados podem modificar o evento" deixa de liberar edição aqui.
- Compromissos criados aqui (sem Google) continuam editáveis por quem os criou.
- Os compromissos que já estão na agenda são recalculados: quem não é do seu e-mail organizador passa a ficar somente leitura, sem precisar reimportar.

## Detalhes técnicos

- `src/lib/googleCalendarSync.server.ts`: `can_edit` passa a ser `!!organizer?.self` (remover o `|| ev.guestsCanModify`).
- `src/components/agenda/AgendaEventViewDialog.tsx`: `canEdit` para `source === 'google'` usa só `event.can_edit` (sem o fallback `|| isOwner`, que é sempre verdadeiro no espelho local).
- `src/components/agenda/AgendaEventDialog.tsx`: substituir o `isOwner` que libera campos/salvar/excluir pela mesma regra (organizador para eventos do Google; criador para eventos locais), mantendo os convidados visíveis em leitura.
- Ajuste de dados nos registros já importados: `can_edit = false` nos eventos com `source = 'google'` cujo `organizer_email` não é o e-mail da conta Google conectada do usuário.
- Nenhuma alteração em tarefas, chat, Gestão ou outros módulos.

## Verificação

1. Abrir um compromisso criado por outra pessoa: sem "Editar" e sem "Excluir", apenas leitura e resposta de presença.
2. Abrir um compromisso criado por você: "Editar" e "Excluir" funcionando e refletindo no Google.

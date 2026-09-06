# Botão "Duplicar" no compromisso

Ao lado de "Editar" na tela de leitura, um botão **Duplicar**.

## Como vai funcionar

- Aparece nas mesmas condições de "Editar" (só o organizador; compromissos criados aqui, só o criador).
- Ao clicar, abre a tela de edição já preenchida com uma cópia: mesmo título com o prefixo "Cópia de", mesma data/hora, duração, local, descrição, cor, lembretes, convidados, repetição, cor, ocupado/disponível, visibilidade, permissões de convidados e a opção de videoconferência.
- Nada é criado antes de você confirmar: a cópia só passa a existir (aqui e no Google, com os convites) quando clicar em **Salvar**. Assim você ajusta data, convidados e o resto antes de disparar convite para alguém.
- O compromisso original não é alterado. O link do Meet não é copiado: se a opção de videoconferência estiver ligada, o Google cria uma sala nova para o novo compromisso.
- Também aparece um item **Duplicar** no rodapé da tela de edição, para duplicar sem voltar à leitura.

## Detalhes técnicos

- `AgendaEventDialog` ganha a prop `duplicateFrom?: CalendarEvent | null`. Quando presente (e sem `event`), o `useEffect` de inicialização preenche todos os campos a partir dela, com título `Cópia de …`, e os convidados vêm de `useEventGuests(duplicateFrom.id)`. `withMeet` reflete o original, mas nenhum `hangout_link`/`google_event_id` é reaproveitado — o salvar segue o caminho de criação já existente (`useCreateEvent`), que pede o Meet novo ao Google.
- `AgendaEventViewDialog` ganha `onDuplicate(event)` e um botão `Copy` ao lado de "Editar", com a mesma condição `canEdit`.
- `src/page-views/Agenda.tsx`: novo estado `duplicateSource`; `duplicateEvent()` fecha a leitura, limpa `selectedEvent` e abre `AgendaEventDialog` com `duplicateFrom`.
- Sem mudanças no banco, na sincronização com o Google ou em outros módulos.

## Verificação

1. Abrir um compromisso próprio com convidados → "Duplicar" abre a edição preenchida com "Cópia de …" e a mesma lista de convidados.
2. Salvar cria um novo compromisso no Google (com Meet próprio quando marcado) sem tocar no original.
3. Compromisso de outra pessoa: sem "Editar" e sem "Duplicar".

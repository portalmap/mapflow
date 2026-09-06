# Agenda: mostrar exatamente a sua agenda do Google

## O que eu confirmei acessando a sua agenda agora

Sim — consegui ler a sua agenda (victorborges@assessoriamap.com.br) direto no Google. Nela aparecem **todos** os compromissos, não importa quem criou: os seus ("Daily Estratégica | MAP", "Reunião ADM"), os que outras pessoas criaram e te convidaram ("Escritório Virtual" do financeiro, "Daily Operacional | MAP", "Checkin | PsicoMed" do Leonardo), os blocos de "Hora de se concentrar" ("Atividade Física", "Jantar com Família") e os pessoais.

Ou seja: a sua agenda do Google já é a lista certa. O problema aqui é que o MAP Flow importou também as agendas de outras pessoas às quais você tem acesso e rotulou os compromissos pela agenda de onde foram lidos — por isso "Victor Borges" ficou com 5 e "Rodrigo Braz" com dezenas.

## O que proponho

1. **Importar só a sua agenda.** A sincronização passa a ler apenas a sua agenda principal do Google (que já contém convites de todo mundo). Agendas de colegas deixam de ser importadas.
2. **Etiqueta única "Minha agenda".** Tudo que vier da sua agenda entra como "Minha agenda", independentemente de quem criou — igual ao Google.
3. **Limpeza do que já entrou.** Remover aqui os compromissos importados das agendas de outras pessoas (nada é apagado no Google), incluindo os duplicados como "Prospecção Ativa".
4. **Histórico antigo.** Os compromissos que perderam o vínculo numa desconexão passada voltam a contar como "Minha agenda"; "Criados aqui" fica só para o que foi criado dentro do MAP Flow.
5. O filtro de agendas continua existindo, mas com poucas entradas: "Minha agenda" e "Criados aqui" (e qualquer agenda extra que você escolher no futuro).

## Detalhes técnicos

- `src/lib/googleCalendarSync.server.ts`: restringir a lista de agendas a `primary` (mais agendas que você marcar explicitamente); manter `singleEvents=true`; ignorar feriados/aniversários; gravar `google_calendar_id` normalizado como o e-mail da conta.
- Migration de limpeza: apagar `calendar_events` com `source='google'` cujo `google_calendar_id` não seja a conta conectada; apagar convidados/lembretes órfãos; reatribuir os eventos "sem vínculo" ao calendário próprio.
- `src/lib/agendaCalendars.ts`: `primary`/e-mail da conta → rótulo "Minha agenda"; sem classificar por criador.
- Sem mudança em tarefas, convites, Gestão, chat ou demais módulos.

## Verificação

1. Contagem por agenda depois da limpeza: só "Minha agenda" (+ "Criados aqui").
2. Semana 6–12/09 aqui bate com a semana no Google (Escritório Virtual, Daily Operacional, Weekly, Reunião ADM etc.).
3. Nova sincronização não traz agendas de colegas de volta.

# Agenda da Wendy: compromissos que não aparecem na tela

## O que eu já confirmei no banco

Na semana do print (21 a 25/09), a agenda da Wendy **tem mais compromissos salvos do que a tela mostra**:

| Dia | Salvos no MAP Flow | Aparecem no print |
|---|---|---|
| Seg 21 | 13 | 5 |
| Ter 22 | 13 | ~3 |
| Qua 23 | 16 | ~4 |
| Qui 24 | 14 | ~5 |
| Sex 25 | 8 | ~4 |

Exemplos de segunda que existem no banco e não aparecem: "Daily Estratégica | MAP", "Daily Operacional | MAP", "Alinhamento de Processos e Automações", "Checkin | Strike Jiu Jitsu", "Weekly de Alta Performance", "Checkin | PsicoMed".

Um detalhe importante: os que aparecem na tela foram gravados às 23:04/23:08 da noite anterior; **todos os que faltam foram gravados depois (23:25, 23:40, 23:46)** — ou seja, a tela parece estar presa a uma foto antiga dos dados, tirada no meio da sincronização (o botão no print ainda está em "Sincronizando").

Também confirmei que não é filtro de agendas (todos os compromissos dela vêm da mesma agenda), não é permissão de acesso e não é compromisso longo escondendo os outros.

Ainda não dá para afirmar 100% a causa raiz sem ver a resposta que o navegador dela recebe — por isso o passo 1 é confirmação.

## O que vou fazer

1. **Confirmar** com medição: mostrar (em desenvolvimento) quantos compromissos o período carregou e comparar com o banco, para provar se a tela recebeu menos do que existe ou se ela está exibindo uma foto velha.
2. **Fazer a tela sempre mostrar o que já está salvo**: recarregar o período ao voltar para a aba, ao reabrir a Agenda e ao fim de cada rodada de sincronização — hoje uma aba aberta há horas pode continuar mostrando dados antigos.
3. **Nunca esconder compromissos durante a sincronização**: o que já está salvo continua visível, e o indicador "Sincronizando" só informa o progresso.
4. **Fazer a importação terminar**: hoje cada "Atualizar" relê a agenda inteira (7 meses) em rodadas de 20 segundos, e cada rodada gasta tempo buscando repetidamente a regra de repetição das séries. Vou reaproveitar esse trabalho entre rodadas e evitar releituras desnecessárias, para a importação concluir e não parar no meio.
5. **Proteger contra remoção indevida**: a limpeza de sobras só roda quando a leitura completa terminou de fato na mesma sincronização — nada é apagado no Google em nenhum caso.

Escopo restrito ao módulo Agenda: tarefas, automações e notificações não são tocadas.

## Detalhes técnicos

- `src/hooks/useAgenda.ts`: `useAgendaEvents` com `refetchOnMount: 'always'`, `refetchOnWindowFocus: true`, `staleTime: 0`; manter a regra conectado/desconectado e a deduplicação por `google_ical_uid`.
- `src/hooks/useGoogleCalendar.ts`: trocar `invalidateQueries` por `refetchQueries` em `['agenda-events']` entre rodadas e no `onSuccess`, garantindo releitura mesmo com a query montada.
- `src/page-views/Agenda.tsx`: manter a grade renderizada enquanto `isLoading`/sincronização estiver em curso (usar dados anteriores em vez de trocar por "Carregando agenda...").
- `src/lib/googleCalendarSync.server.ts`:
  - persistir o cache de recorrência (`recurrenceCache`) no `sync_cursor` ou derivar o RRULE do próprio item da série, eliminando um GET por série por rodada;
  - evitar o `update` quando etag e `google_event_id` coincidem (já existe) e reduzir os `update` em lote de `last_synced_at` agrupando com o próprio update do registro;
  - manter a limpeza de sobras condicionada a `startedFromScratch && finishedAllPages`, e adicionar a condição de a rodada não ter sido interrompida por tempo;
  - instrumentar contagens (`pulled`, páginas, `more`) em log para confirmar a conclusão da leitura completa.
- Verificação: `bunx tsgo --noEmit`, `/agenda` respondendo 200 e recontagem por dia no banco versus o que a tela exibe.

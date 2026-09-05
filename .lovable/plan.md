# Gestão — Reuniões ao vivo (quem está online agora)

Nova aba dentro do módulo Gestão, ao lado de "Presença em reuniões": mostra as reuniões do Google Meet que estão acontecendo neste momento e quem está dentro delas.

## O que a pessoa vai ver

- Lista de reuniões em andamento, cada uma com: título (quando vier da Agenda) ou o código da reunião, hora de início, tempo decorrido e número de pessoas online.
- Ao abrir a reunião: lista de quem está online agora, com a hora em que entrou e quanto tempo está dentro; e uma segunda lista de quem já saiu, com entrada e saída.
- Quem voltou depois de sair aparece com o histórico de entradas/saídas.
- Convidados da Agenda que ainda não entraram aparecem como "ainda não entrou".
- Reuniões instantâneas (criadas direto no Meet, sem compromisso na Agenda) também aparecem — nesse caso sem título, identificadas pelo código da reunião.
- Atualização automática a cada 30 segundos, com botão "Atualizar agora" e indicação de "atualizado há X".
- Estado vazio claro: "Nenhuma reunião em andamento agora".

## Como funciona por trás

- O sistema consulta o Google Meet e considera "ao vivo" toda reunião ainda sem hora de término, e "online" todo participante cuja sessão ainda não tem hora de saída.
- A consulta é feita com as contas do Google já conectadas por pessoas com acesso à Gestão; cada conta enxerga as reuniões das quais participa/organiza. Uma reunião entre pessoas sem nenhuma conta conectada não aparece.
- Os dados coletados são gravados nas mesmas tabelas de presença já existentes, então quando a reunião termina ela passa naturalmente para o relatório histórico.

## Detalhes técnicos

- `src/lib/meetingAttendance.server.ts`: nova função `collectLiveMeetAttendance(userId)` — lista `conferenceRecords` recentes (janela de ~12h), mantém as que têm `endTime` nulo, busca `participants` + `participantSessions` e grava com upsert (`leave_time` nulo = online). Reaproveita `meetApi` e o cache de `space` já existentes; nenhuma alteração no fluxo atual de coleta histórica.
- `src/lib/management.functions.ts`: `listLiveMeetings` (server fn, `requireSupabaseAuth` + `assertAccess`) que dispara a coleta ao vivo para as contas Google conectadas de membros da Gestão e retorna `{ meetings: [{ id, title, meetCode, startTime, online: [...], left: [...], invitedNotJoined: [] }], refreshedAt }`.
- `src/hooks/useManagement.ts`: `useLiveMeetings()` com `refetchInterval: 30_000` e `refetchOnWindowFocus`.
- `src/components/gestao/LiveMeetingsPanel.tsx`: novo componente (cards + colapsáveis), reutilizando os formatadores de data/duração no padrão do relatório atual.
- `src/page-views/Gestao.tsx`: nova `TabsTrigger`/`TabsContent` "Ao vivo" como aba inicial.
- Sem migração de banco: as tabelas `meeting_attendance_conferences` / `meeting_attendance_sessions` já suportam `end_time`/`leave_time` nulos.
- Módulos Agenda, sincronização, tarefas e chat não são tocados.

## Limitações a assumir

- O Google publica os dados de conferência com atraso de alguns segundos a poucos minutos: quem acabou de entrar pode demorar um ciclo para aparecer.
- Participantes anônimos ou por telefone aparecem sem e-mail.
- Reuniões sem nenhuma conta do Google conectada ao MAP Flow não são visíveis.
- Depende do plano do Google Workspace liberar o histórico de participação da conta organizadora.

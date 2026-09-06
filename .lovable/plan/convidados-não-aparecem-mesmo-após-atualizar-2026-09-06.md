# Convidados não aparecem mesmo após "Atualizar"

## O que aconteceu ao clicar em "Atualizar"

O clique funcionou (a conta registra sincronização às 13:31), mas ela rodou no modo "só o que mudou" desde a última vez. Resultado: apenas 1 compromisso (que mudou no Google recentemente) ganhou seus 10 convidados. Os outros 1.738 compromissos continuam sem convidados porque o Google não os devolveu — nada mudou neles.

Diagnóstico confirmado: o problema não é a tela, é que os compromissos antigos nunca voltam a passar pela importação. A correção planejada anteriormente ainda não foi aplicada; é isso que será feito agora.

## O que será feito

1. **Releitura completa uma única vez**: zerar o marcador de "já sincronizei até aqui" da sua conta Google, para que o próximo "Atualizar" percorra toda a agenda do período e grave os convidados de cada compromisso.
2. **Rede de segurança permanente na sincronização**: se um compromisso do Google chegar sem convidados salvos aqui, os convidados passam a ser gravados mesmo que o compromisso não tenha mudado. Isso evita que o problema volte (por exemplo, para outras pessoas que conectarem a agenda).
3. **Conferir o resultado**: após um novo "Atualizar", abrir um compromisso com convidados e confirmar total, resumo de respostas (sim / não / sem resposta), organizador e marcação "opcional".

Nada é criado ou alterado no Google — apenas leitura e espelhamento aqui. Compromissos sem convidados no Google continuam sem a seção.

## Depois da correção

Será preciso clicar em "Atualizar" uma vez (a releitura completa pode levar mais de uma rodada se houver muitos compromissos; o botão pode ser clicado novamente até finalizar).

## Detalhes técnicos

- Limpeza pontual em `calendar_google_accounts` do usuário conectado: `sync_token = null`, `sync_tokens = '{}'`, `sync_cursor` zerado, forçando listagem completa (`timeMin/timeMax`) na próxima passada.
- `src/lib/googleCalendarSync.server.ts` (`applyPage`): antes do `continue` por etag igual, consultar em lote quais eventos existentes já têm linhas em `calendar_event_guests`; eventos com `ev.attendees` no Google e sem convidados locais entram no espelhamento de convidados mesmo sem alteração de etag.
- Nenhuma alteração em `useAgenda.ts`, nos diálogos de leitura/edição, nem em outros módulos.

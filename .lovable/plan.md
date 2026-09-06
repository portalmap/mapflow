# Liberar o histórico de participação do Meet — caminho correto

O menu do Admin do Google mudou de nome. Abaixo o caminho atual, com o que fazer se cada item não aparecer.

## Passo a passo (admin.google.com)

1. Entre em **admin.google.com** com a conta administradora do domínio.
2. No topo, use a **busca do Admin** (é o caminho mais confiável): digite `Meet` e escolha **Configurações do Google Meet**.
   - Pelo menu: **Apps > Google Workspace > Google Meet**.
3. Abra **Configurações de vídeo do Meet** e selecione a unidade organizacional no lado esquerdo (ou "Todos").
4. Ative **Acompanhamento de participação / Relatório de participação** (em inglês: *Attendance tracking / Attendance reports*).
   - Se essa opção não existir, o plano do Workspace não inclui o recurso (veja abaixo).
5. Busque por `Controles de API` e confirme que a **Google Meet API** não está bloqueada.
   - Pelo menu: **Segurança > Controle de acesso e dados > Controles de API > Gerenciar o acesso de apps de terceiros**.
6. Volte ao MAP Flow, abra a **Agenda** e clique em **Reconectar** no Google uma vez, para autorizar a nova permissão de leitura das reuniões.

## Se nenhum desses itens aparecer

Isso indica um destes casos — vale confirmar antes de mexer em mais alguma coisa:

- A conta usada não é administradora do domínio (só a conta admin vê **Apps** e **Segurança**).
- O e-mail é Gmail comum, não Google Workspace: nesse caso não existe Admin console e o histórico de participação não é oferecido.
- O plano é Business Starter / Frontline: o relatório de participação exige **Business Standard ou superior** (ou Enterprise/Education equivalentes).

## O que já está pronto no sistema

- A aba **Ao vivo** em Gestão já mostra as reuniões em andamento e quem está online, dependendo apenas da liberação acima e da reconexão da conta Google.
- Nenhuma alteração de código é necessária para este item; ele é de configuração no Google.

## Como confirmar que funcionou

Depois da reconexão, entre em uma reunião do Meet e abra **Gestão > Ao vivo**: em até um ciclo de atualização (30 s) a reunião e os participantes devem aparecer. Se continuar vazio, o bloqueio ainda está no lado do Google (plano ou permissão da conta organizadora).

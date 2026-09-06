# A opção não existe no Admin — caminho alternativo

As telas que você enviou mostram todas as **Configurações de vídeo do Meet** do seu domínio (reações, telefonia, gravação, qualidade, interoperabilidade, efeitos, integrações, pareamento). Não há item de **relatório/acompanhamento de participação** entre elas.

Isso significa uma coisa só: a edição do Workspace do domínio `assessoriamap.com.br` não oferece o relatório de participação do Meet como opção de administrador. Não adianta continuar procurando nesse menu.

## A boa notícia

O MAP Flow **não depende** dessa opção do Admin. O módulo Gestão lê a participação direto pela API do Google Meet, usando a conta Google conectada. Essa leitura funciona mesmo sem o relatório de participação estar ligado no Admin — o que ela exige é:

- a conta conectada ser a **organizadora** da reunião (ou do mesmo domínio), e
- a autorização de leitura das reuniões concedida à conta conectada.

## O que fazer agora (5 minutos, sem Admin)

1. Abrir a **Agenda** no MAP Flow e clicar em **Reconectar** no Google uma vez. Isso pede a nova permissão de leitura das reuniões (é o passo que ainda falta).
2. Entrar em uma reunião do Meet criada pela sua conta (pode ser uma reunião instantânea de teste, sozinho mesmo).
3. Abrir **Gestão > Ao vivo** e aguardar um ciclo de atualização (30 segundos).

## Como interpretar o resultado

- **Aparece a reunião e você na lista de online:** está tudo funcionando; a partir daí o histórico também passa a ser preenchido na aba "Presença em reuniões".
- **Continua vazio:** aí sim o bloqueio é da edição do Workspace, e o único caminho é subir para uma edição que libere os dados de participação do Meet (Business Standard ou superior). Nesse caso eu adiciono no painel um aviso explicando isso, em vez de deixar a tela vazia sem explicação.

## O que eu faço em seguida

Depois da reconexão, eu rodo a verificação do lado do servidor e digo exatamente o que o Google respondeu — se for recusa por plano, a mensagem vem nomeada e a gente decide o próximo passo com base nela. Nenhuma mudança de código é necessária antes desse teste.

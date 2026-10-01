# Corrigir E/OU no resumo das automações

## Diagnóstico confirmado

O editor salva e reabre corretamente os conectores de cada gatilho em `trigger_logics`. Porém, o cartão exibido na lista de automações ignora essa configuração e mostra **OU** fixamente entre todos os gatilhos. Por isso a lista diverge do conteúdo configurado dentro da automação.

## Alteração

1. Ajustar o resumo do cartão para ler o conector correspondente em `action_config.trigger_logics`.
2. Exibir **E** quando o valor salvo for `AND` e **OU** quando for `OR`, preservando a ordem dos gatilhos.
3. Manter compatibilidade com automações antigas que possuem gatilhos adicionais em `or_triggers`, mas ainda não possuem `trigger_logics`: nesses casos, continuar tratando o conector como **OU**.
4. Concentrar a interpretação do resumo no módulo de automações, sem alterar execução, banco de dados ou outros módulos.

## Verificação

- Conferir uma automação configurada com **E** e confirmar **E** na lista.
- Conferir uma automação configurada com **OU** e confirmar **OU** na lista.
- Conferir uma combinação mista de três ou mais gatilhos.
- Confirmar que automações antigas continuam aparecendo como **OU**.
- Validar a tela de automações e os registros de compilação após a mudança.

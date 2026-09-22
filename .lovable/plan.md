# Dia específico do mês: referência é a data de criação da tarefa

## Situação hoje

Na ação automática "Definir data de vencimento" com o tipo "Dia específico do mês", o sistema monta a data usando o **mês atual (dia de hoje)** como referência. Isso pode gerar um vencimento já vencido — por exemplo, tarefa criada no dia 16 com regra "dia 15" recebe vencimento no dia 15, antes da própria criação.

## Nova regra

1. O mês de referência passa a ser o **mês em que a tarefa foi criada**, não o mês corrente da execução.
2. Monta-se a data com o dia configurado dentro desse mês (se o mês não tiver aquele dia, usa o último dia do mês).
3. Se a data resultante for **anterior à data de criação**, o vencimento passa a ser **data de criação + 1 dia**.
   - Exemplo: regra dia 15, tarefa criada dia 16 → vencimento dia 17.
   - Exemplo: regra dia 25, tarefa criada dia 10 → vencimento dia 25 (sem ajuste).
4. Se a data resultante for igual ou posterior à criação, nada muda.

## Fora do escopo

- A regra de **recorrência** (tipo "Recorrente" e seus modos mensais) **não é alterada**.
- Os tipos "Primeiro dia do mês", "Último dia do mês" e "Dias após o gatilho" continuam como estão.
- A ação de data de início segue inalterada, a menos que você peça o mesmo comportamento lá.

## Detalhes técnicos

- Arquivo: `src/hooks/useStatusChangeAutomations.ts`, função `executeSetDueDate`.
- A consulta atual (`select('due_date')`) passa a trazer também `created_at`, usado como data de referência (normalizada para o fuso local, sem hora).
- No ramo `config.date_type === 'specific_day'`, substituir `new Date()` pela data de criação da tarefa e aplicar o clamp de dia do mês e a regra de criação + 1 dia.
- A gravação, o log de atividade `due_date.changed` e o restante do fluxo permanecem iguais.

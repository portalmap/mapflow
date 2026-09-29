# calendario.publicar — id da tarefa no campo `id`

## Situação atual (verificada no código)

A mudança pedida **já está implementada** em `supabase/functions/hub-inbox/index.ts`.
Todos os itens de `resultados` devolvem o código da tarefa em `id`:

| Situação do post | Campos devolvidos |
|---|---|
| Tarefa criada agora | `external_post_ref`, `id` (uuid da tarefa), `status: "criada"` |
| Tarefa já existia | `external_post_ref`, `id` (uuid da tarefa), `status: "ja_existia"` |
| Erro (canal sem status) | `external_post_ref`, `id: null`, `status: "erro"`, `error`, `canal`, `status_disponiveis` |

O campo `task_id` não aparece mais em nenhum item de `resultados` (só permanece como
coluna interna do banco, invisível ao Social Flow). `external_post_ref`, `status` e
`error` estão exatamente como o Social Flow já espera.

## O que falta fazer

1. **Confirmar que o deploy vigente do hub-inbox já contém esta versão.** Se o
   deploy da última alteração não tiver sido concluído, fazer o deploy da função
   `hub-inbox` (isolada — não afeta outros módulos).
2. **Comunicar o formato final ao Social Flow** para reenviar o lote do Accerth
   (29/09, ~18h) e retestar.

## Pendente relacionado (aguarda decisão, fora do escopo deste pedido)

- **Apelidos de canal:** os posts do Accerth chegam com `social_channel: "whatsapp_canal"`,
  que não bate com nenhum status da lista (ex.: "Canal Whatsapp"). Por isso as 8 tarefas
  falharam com `status_do_canal_nao_encontrado` — não pelo formato da resposta.
  Corrigir exige a confirmação dos nomes exatos dos canais/status usados pelo Social Flow.

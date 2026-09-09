# Garantir que a barra de avisos sempre role

## Por que ela para para alguns

Encontrei duas razões no código atual da barra:

1. **Ajuste "reduzir animações" do aparelho.** O estilo da barra desliga a rolagem por completo
   quando o sistema do usuário (Windows, macOS, Android, iOS) está com esse ajuste ligado. Quem
   tem isso ativado vê a barra totalmente parada — é o caso mais provável do que você notou.
2. **Conteúdo curto demais.** Quando existe apenas um aviso (ou só a frase motivacional), o
   trecho pode ficar menor que a largura da barra e o movimento fica quase imperceptível.

Fora isso, a barra também para enquanto o mouse está sobre ela — isso é intencional e você
pediu para manter.

## O que será feito

1. **Rolar sempre**, mesmo com "reduzir animações" ligado no aparelho: a regra que desligava o
   movimento sai, e o movimento passa a valer para todos.
2. **Repetir o conteúdo o quanto for preciso** para a faixa ficar sempre mais larga que a barra,
   garantindo movimento visível mesmo com um único aviso ou só a frase.
3. **Rede de segurança**: logo após montar, a barra confere se o movimento realmente começou; se
   não tiver começado (por qualquer bloqueio do navegador), ela reinicia o movimento por conta
   própria, num ritmo constante.
4. **Manter a pausa no mouse** e o clique no aviso para abrir o detalhe, como já funciona hoje.

## Detalhes técnicos

- `src/styles.css`: remover o bloco `@media (prefers-reduced-motion: reduce)` que zera
  `animation` de `.ticker-track` (mantendo o resto do estilo intacto).
- `src/components/notifications/NotificationTicker.tsx`:
  - medir a largura do conteúdo e do contêiner, calcular quantas cópias são necessárias
    (mínimo 2) e renderizar essa quantidade; a duração continua proporcional à largura
    (60 px/s, mínimo 18 s), agora usando `translateX(-100%/cópias)` equivalente via largura
    de um bloco.
  - após montar e a cada troca de conteúdo, checar `el.getAnimations()`; se nenhuma animação
    estiver rodando, aplicar um fallback com `requestAnimationFrame` movendo `translateX`
    manualmente e reiniciando ao completar um bloco.
  - manter `group-hover:[animation-play-state:paused]` e pausar também o fallback no hover.
- Escopo isolado ao módulo de notificações: nenhuma mudança de dados, de rotas ou de outros
  módulos.

import { useEffect, useRef } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { endActivitySession, pingActivity } from '@/lib/activity.functions';
import { useAuth } from '@/contexts/AuthContext';

/** Sem interação por este tempo => "online inativo". */
const IDLE_AFTER_MS = 3 * 60 * 1000;
/** Frequência do sinal de presença. */
const HEARTBEAT_MS = 60 * 1000;

/**
 * Registra o tempo de uso do Flow: envia um sinal de presença por minuto,
 * marcando "ativo" quando há interação recente e "inativo" caso contrário.
 * Módulo isolado: não interfere em nenhuma outra funcionalidade.
 */
export function useActivityTracker() {
  const { user } = useAuth();
  const ping = useServerFn(pingActivity);
  const endSession = useServerFn(endActivitySession);

  const lastInteraction = useRef(Date.now());
  const sessionId = useRef<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    let stopped = false;
    sessionId.current = null;
    lastInteraction.current = Date.now();

    const touch = () => {
      lastInteraction.current = Date.now();
    };

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'wheel',
      'scroll',
      'mousemove',
      'touchstart',
    ];
    for (const ev of events) window.addEventListener(ev, touch, { passive: true });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') touch();
      void beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const beat = async () => {
      if (stopped || busy.current) return;
      busy.current = true;
      try {
        const idle =
          document.visibilityState !== 'visible' ||
          Date.now() - lastInteraction.current > IDLE_AFTER_MS;
        const result = await ping({
          data: {
            sessionId: sessionId.current,
            state: idle ? 'idle' : 'active',
            userAgent: navigator.userAgent.slice(0, 300),
          },
        });
        sessionId.current = result?.sessionId ?? sessionId.current;
      } catch {
        /* rede instável: tenta no próximo sinal */
      } finally {
        busy.current = false;
      }
    };

    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_MS);

    const onLeave = () => {
      const id = sessionId.current;
      if (!id) return;
      void endSession({ data: { sessionId: id } }).catch(() => {});
    };
    window.addEventListener('pagehide', onLeave);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      for (const ev of events) window.removeEventListener(ev, touch);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
      onLeave();
    };
  }, [user?.id, ping, endSession]);
}

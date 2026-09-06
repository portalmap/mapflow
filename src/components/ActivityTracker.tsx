import { useActivityTracker } from '@/hooks/useActivityTracker';

/** Componente invisível: registra o tempo de uso do Flow em todas as páginas. */
export function ActivityTracker() {
  useActivityTracker();
  return null;
}

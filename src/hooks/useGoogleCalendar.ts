import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import {
  completeGoogleCalendarConnection,
  disconnectGoogleCalendarAccount,
  getMyGoogleCalendarStatus,
  listGoogleCalendarAccounts,
  startGoogleCalendarConnect,
  syncMyGoogleCalendar,
} from '@/lib/google-calendar.functions';
import { useAuth } from '@/contexts/AuthContext';

const CONNECTOR_ID = 'google_calendar';

export function useMyGoogleStatus() {
  const { user } = useAuth();
  const fetchStatus = useServerFn(getMyGoogleCalendarStatus);
  return useQuery({
    queryKey: ['google-calendar-status', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStatus(),
  });
}

export const GOOGLE_CONNECT_RETURN_TO_KEY = 'google-calendar:return-to';
export const GOOGLE_OAUTH_CHANNEL = 'google-calendar:oauth';

export type GoogleOAuthOutcome = {
  type: 'appUserConnectorOAuthComplete' | 'appUserConnectorOAuthFailed';
  connectorId: string;
  code: string | null;
  error: string | null;
};

/** Publica o resultado do OAuth para outras abas da mesma origem. */
export function publishGoogleOAuthOutcome(outcome: GoogleOAuthOutcome) {
  const payload = JSON.stringify({ ...outcome, at: Date.now() });
  try {
    new BroadcastChannel(GOOGLE_OAUTH_CHANNEL).postMessage(payload);
  } catch {
    /* navegador sem BroadcastChannel: usa localStorage */
  }
  try {
    localStorage.setItem(GOOGLE_OAUTH_CHANNEL, payload);
  } catch {
    /* sem armazenamento disponível */
  }
}

function isInsideIframe() {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/**
 * Escuta a conclusão do OAuth feita em aba nova (mesma origem) e devolve o código
 * de uso único para que a troca aconteça nesta aba, que tem a sessão do MAP Flow.
 * O Google corta o vínculo `window.opener` (COOP), por isso também ouvimos o
 * canal compartilhado do navegador.
 */
function waitForOAuthTabCompletion(tab: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    let timeout: number | undefined;
    let channel: BroadcastChannel | null = null;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
      if (poll !== undefined) window.clearInterval(poll);
      if (timeout !== undefined) window.clearTimeout(timeout);
      channel?.close();
    };

    const settle = (outcome: GoogleOAuthOutcome) => {
      if (outcome.connectorId !== CONNECTOR_ID) return;
      cleanup();
      if (outcome.type === 'appUserConnectorOAuthComplete') {
        resolve(typeof outcome.code === 'string' ? outcome.code : null);
        return;
      }
      reject(new Error(outcome.error || 'Não foi possível concluir a conexão com o Google.'));
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (
        data?.type !== 'appUserConnectorOAuthComplete' &&
        data?.type !== 'appUserConnectorOAuthFailed'
      )
        return;
      settle(data as GoogleOAuthOutcome);
    };

    const parse = (raw: unknown): GoogleOAuthOutcome | null => {
      if (typeof raw !== 'string') return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed?.type ? (parsed as GoogleOAuthOutcome) : null;
      } catch {
        return null;
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== GOOGLE_OAUTH_CHANNEL) return;
      const outcome = parse(event.newValue);
      if (outcome) settle(outcome);
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    try {
      channel = new BroadcastChannel(GOOGLE_OAUTH_CHANNEL);
      channel.onmessage = (event) => {
        const outcome = parse(event.data);
        if (outcome) settle(outcome);
      };
    } catch {
      /* sem BroadcastChannel */
    }

    poll = window.setInterval(() => {
      if (!tab.closed) return;
      cleanup();
      // A aba pode ter concluído sozinha; a Agenda revalida o status.
      resolve(null);
    }, 500);

    timeout = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 180_000);
  });
}

export function useConnectGoogleCalendar() {
  const queryClient = useQueryClient();
  const start = useServerFn(startGoogleCalendarConnect);
  const complete = useServerFn(completeGoogleCalendarConnection);

  return useMutation({
    mutationFn: async () => {
      const { authorizationUrl } = await start();
      sessionStorage.setItem(
        GOOGLE_CONNECT_RETURN_TO_KEY,
        `${window.location.pathname}${window.location.search}`,
      );
      try {
        localStorage.removeItem(GOOGLE_OAUTH_CHANNEL);
      } catch {
        /* sem armazenamento */
      }


      // Fora de iframe: a própria página vai ao Google e volta para a rota de retorno,
      // que conclui a troca do código e redireciona de volta.
      if (!isInsideIframe()) {
        window.location.assign(authorizationUrl);
        // A navegação descarrega a página; o mutation não retorna.
        return new Promise<boolean>(() => {});
      }

      // Dentro da pré-visualização (iframe): abre a autorização em aba independente
      // já com a URL final (evita herdar restrições do contexto incorporado).
      // Sem "noopener" para que a rota de retorno consiga avisar esta aba.
      const tab = window.open(authorizationUrl, '_blank');
      if (!tab) {
        sessionStorage.removeItem(GOOGLE_CONNECT_RETURN_TO_KEY);
        throw new Error('Libere as janelas pop-up do navegador e tente de novo.');
      }
      const code = await waitForOAuthTabCompletion(tab);
      // Quando o código chega aqui, a troca acontece nesta aba (que tem a sessão).
      // Sem código, a própria aba de retorno já concluiu: só revalidamos o status.
      if (code) await complete({ data: { code } });
      return true;
    },
    onSuccess: () => {
      sessionStorage.removeItem(GOOGLE_CONNECT_RETURN_TO_KEY);
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-accounts'] });
    },
    onError: (e: Error) => {
      sessionStorage.removeItem(GOOGLE_CONNECT_RETURN_TO_KEY);
      toast.error(e.message || 'Erro ao conectar o Google');
    },
  });
}

export type SyncProgress = { calendar: number; calendars: number } | null;

// Evita duas sincronizações simultâneas na mesma aba (botão + auto-sync).
let syncInFlight: Promise<Awaited<ReturnType<typeof syncMyGoogleCalendar>>> | null = null;

/**
 * Sincroniza com o Google em rodadas: o servidor devolve `more: true` enquanto
 * ainda houver páginas/agendas a importar, e a agenda é atualizada entre rodadas.
 */
export function useSyncGoogleCalendar() {
  const queryClient = useQueryClient();
  const sync = useServerFn(syncMyGoogleCalendar);
  const [progress, setProgress] = useState<SyncProgress>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (syncInFlight) return syncInFlight;
      const run = (async () => {
        const MAX_ROUNDS = 40;
        let result = await sync();
        let rounds = 1;
        while (result?.more && !result.error && rounds < MAX_ROUNDS) {
          setProgress(result.progress ?? null);
          queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
          result = await sync();
          rounds += 1;
        }
        return result;
      })();
      syncInFlight = run;
      try {
        return await run;
      } finally {
        syncInFlight = null;
        setProgress(null);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      if (result?.error) toast.error('O Google recusou a sincronização. Tente reconectar.');
    },
    onError: () =>
      toast.error('Não foi possível sincronizar com o Google', {
        description: 'Tente novamente em "Atualizar" ou reconecte a conta.',
      }),
  });

  return { ...mutation, progress };
}

export function useGoogleCalendarAccounts(enabled: boolean) {
  const list = useServerFn(listGoogleCalendarAccounts);
  return useQuery({
    queryKey: ['google-calendar-accounts'],
    enabled,
    queryFn: () => list(),
  });
}

export function useDisconnectGoogleAccount() {
  const queryClient = useQueryClient();
  const disconnect = useServerFn(disconnectGoogleCalendarAccount);

  return useMutation({
    mutationFn: (userId: string) => disconnect({ data: { userId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      const removed = result?.removed ?? 0;
      toast.success('Conta desconectada', {
        description:
          removed > 0
            ? `${removed} compromisso(s) do Google foram removidos daqui. Reconecte para trazê-los de volta.`
            : 'Nenhum compromisso do Google estava salvo aqui.',
      });

    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao desconectar'),
  });
}

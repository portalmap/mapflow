import { useEffect, useRef } from 'react';
import { RefreshCw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useConnectGoogleCalendar,
  useMyGoogleStatus,
  useSyncGoogleCalendar,
} from '@/hooks/useGoogleCalendar';

export function GoogleAgendaButton() {
  const { data: status, isLoading } = useMyGoogleStatus();
  const connect = useConnectGoogleCalendar();
  const sync = useSyncGoogleCalendar();
  const autoSynced = useRef(false);

  const connected = !!status?.connected;

  // Sincroniza ao abrir a agenda (uma vez por carregamento) e após conectar.
  useEffect(() => {
    if (!connected || autoSynced.current || sync.isPending) return;
    autoSynced.current = true;
    sync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (isLoading) return null;

  if (!connected) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => connect.mutate()}
        disabled={connect.isPending}
      >
        <Link2 className="mr-1.5 h-3.5 w-3.5" />
        {connect.isPending ? 'Conectando...' : 'Conectar Google'}
      </Button>
    );
  }

  const offline = status?.status === 'offline';
  const syncLabel = sync.isPending
    ? sync.progress && sync.progress.calendars > 1
      ? `Sincronizando ${sync.progress.calendar}/${sync.progress.calendars}`
      : 'Sincronizando'
    : status?.lastSyncedAt
      ? `Atualizado às ${new Date(status.lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      : 'Atualizar';

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} />
            {syncLabel}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {status?.googleEmail ? `Espelhado com ${status.googleEmail}` : 'Espelhado com o Google Agenda'}
        </TooltipContent>
      </Tooltip>

      <Button
        variant={offline ? 'outline' : 'ghost'}
        size="sm"
        className={`h-8 text-xs ${offline ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => connect.mutate()}
        disabled={connect.isPending}
      >
        {connect.isPending ? 'Reconectando...' : 'Reconectar'}
      </Button>
    </div>
  );
}

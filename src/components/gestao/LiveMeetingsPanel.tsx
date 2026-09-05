import { ChevronDown, RadioTower, RefreshCw, Users, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveMeetings } from '@/hooks/useManagement';

function fmtTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

const TYPE_LABEL: Record<string, string> = {
  signed_in: 'Conta Google',
  anonymous: 'Anônimo',
  phone: 'Telefone',
};

export function LiveMeetingsPanel() {
  const { data, isLoading, isFetching, refetch } = useLiveMeetings(true);
  const meetings = data?.meetings ?? [];
  const onlineTotal = meetings.reduce((acc, m) => acc + m.online.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <RadioTower className="h-3 w-3" />
          {meetings.length} reunião(ões) agora
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {onlineTotal} pessoa(s) online
        </Badge>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar agora
        </Button>
        {data?.refreshedAt && (
          <span className="text-xs text-muted-foreground">
            Atualizado às {fmtTime(data.refreshedAt)} · atualiza sozinho a cada 30s
          </span>
        )}
      </div>

      {data?.notice && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">{data.notice}</CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !meetings.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma reunião em andamento agora. Reuniões da agenda e reuniões instantâneas aparecem
            aqui poucos instantes depois de alguém entrar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Collapsible key={meeting.id} defaultOpen>
              <Card>
                <CollapsibleTrigger className="w-full text-left">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="flex items-center gap-2 truncate text-base">
                        <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
                        {meeting.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Começou às {fmtTime(meeting.startTime)}
                        {meeting.meetCode ? ` · ${meeting.meetCode}` : ''}
                        {meeting.fromAgenda ? ' · da agenda' : ' · instantânea'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge className="gap-1">
                        <Video className="h-3 w-3" />
                        {meeting.online.length} online
                      </Badge>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                        Online agora
                      </p>
                      {meeting.online.length ? (
                        <ul className="space-y-2">
                          {meeting.online.map((p) => (
                            <li
                              key={p.key}
                              className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 last:border-0"
                            >
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {TYPE_LABEL[p.type] ?? p.type} · entrou às {fmtTime(p.firstJoin)} ·{' '}
                                {fmtDuration(p.totalSeconds)} na reunião
                                {p.sessions.length > 1
                                  ? ` · ${p.sessions.length - 1} retorno(s)`
                                  : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Ninguém online neste momento.</p>
                      )}
                    </div>

                    {meeting.left.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                          Já saíram
                        </p>
                        <ul className="space-y-1 text-sm">
                          {meeting.left.map((p) => (
                            <li key={p.key} className="flex flex-wrap justify-between gap-2">
                              <span>{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {fmtTime(p.firstJoin)} → {fmtTime(p.lastLeave)} ·{' '}
                                {fmtDuration(p.totalSeconds)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {meeting.invitedNotJoined.length > 0 && (
                      <div className="rounded-md border border-dashed p-3 text-sm">
                        <p className="mb-1 font-medium">Convidados que ainda não entraram</p>
                        <p className="text-muted-foreground">
                          {meeting.invitedNotJoined.join(', ')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}

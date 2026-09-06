import { useMemo, useState } from 'react';
import { Activity, Download, RefreshCw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFlowUsageDetails, useFlowUsageReport } from '@/hooks/useFlowUsage';
import type { FlowUsageUser } from '@/lib/activity.functions';

const RANGES = [
  { value: 'today', label: 'Hoje', days: 0 },
  { value: '7', label: 'Últimos 7 dias', days: 7 },
  { value: '30', label: 'Últimos 30 dias', days: 30 },
  { value: 'month', label: 'Mês atual', days: -1 },
] as const;

function rangeToDates(value: string) {
  const to = new Date();
  const from = new Date();
  if (value === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (value === 'month') {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - Number(value));
    from.setHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return '—';
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

function formatWhen(iso: string | null) {
  if (!iso) return 'Nunca acessou';
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  const rel =
    mins < 2
      ? 'agora'
      : mins < 60
        ? `há ${mins} min`
        : mins < 60 * 24
          ? `há ${Math.round(mins / 60)} h`
          : `há ${Math.round(mins / (60 * 24))} dia(s)`;
  return `${date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} (${rel})`;
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function FlowUsageReport() {
  const [range, setRange] = useState<string>('7');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FlowUsageUser | null>(null);

  const { from, to } = useMemo(() => rangeToDates(range), [range]);
  const periodDays = useMemo(() => {
    const start = new Date(from);
    const end = new Date(to);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, [from, to]);
  const { data, isLoading, isFetching, refetch } = useFlowUsageReport(from, to);
  const details = useFlowUsageDetails(selected?.userId ?? null, from, to);


  const users = useMemo(() => {
    const list = data?.users ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term ? list.filter((u) => u.userName.toLowerCase().includes(term)) : list;
    return [...filtered].sort((a, b) => b.activeSeconds - a.activeSeconds);
  }, [data, search]);

  const summary = useMemo(() => {
    const list = data?.users ?? [];
    const active = list.reduce((acc, u) => acc + u.activeSeconds, 0);
    const idle = list.reduce((acc, u) => acc + u.idleSeconds, 0);
    const withAccess = list.filter((u) => u.sessionCount > 0).length;
    return {
      active,
      idle,
      withAccess,
      without: list.length - withAccess,
      avgPerPerson: withAccess > 0 ? (active + idle) / withAccess : 0,
    };
  }, [data]);

  const exportCsv = () => {
    const header = [
      'Pessoa',
      'Online ativo (min)',
      'Online inativo (min)',
      'Offline (min)',
      'Último acesso',
      'Dias com acesso',
      'Dias por semana',
      'Sessões',
      'Média por dia (min)',
      'Média por sessão (min)',
    ];
    const rows = users.map((u) => [
      u.userName,
      Math.round(u.activeSeconds / 60),
      Math.round(u.idleSeconds / 60),
      Math.round(u.offlineSeconds / 60),
      u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('pt-BR') : '',
      u.activeDays,
      u.daysPerWeek,
      u.sessionCount,
      Math.round(u.avgPerDaySeconds / 60),
      Math.round(u.avgPerSessionSeconds / 60),
    ]);
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tempo-no-flow-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar pessoa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!users.length}>
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" /> Online ativo (equipe)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatDuration(summary.active)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online inativo (equipe)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatDuration(summary.idle)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média por pessoa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatDuration(summary.avgPerPerson)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> Sem acesso no período
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.without}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Online ativo</TableHead>
                    <TableHead>Online inativo</TableHead>
                    <TableHead>Offline</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Dias/semana</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Média/dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.userId}
                      className="cursor-pointer"
                      onClick={() => setSelected(u)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            {u.avatarUrl ? <AvatarImage src={u.avatarUrl} /> : null}
                            <AvatarFallback className="text-xs">
                              {initials(u.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="whitespace-nowrap font-medium">{u.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(u.activeSeconds)}</TableCell>
                      <TableCell>{formatDuration(u.idleSeconds)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDuration(u.offlineSeconds)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatWhen(u.lastSeenAt)}
                      </TableCell>
                      <TableCell>{u.activeDays}</TableCell>
                      <TableCell>{u.daysPerWeek}</TableCell>
                      <TableCell>{u.sessionCount}</TableCell>
                      <TableCell>{formatDuration(u.avgPerDaySeconds)}</TableCell>
                    </TableRow>
                  ))}
                  {!users.length ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        Nenhum registro no período.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.userName}</DialogTitle>
          </DialogHeader>
          {details.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-sm font-medium">Por dia</h3>
                <div className="space-y-1">
                  {(details.data?.days ?? []).map((d) => (
                    <div key={d.day} className="flex items-center justify-between text-sm">
                      <span>{new Date(`${d.day}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                      <span className="text-muted-foreground">
                        ativo {formatDuration(d.activeSeconds)} · inativo{' '}
                        {formatDuration(d.idleSeconds)}
                      </span>
                    </div>
                  ))}
                  {!details.data?.days?.length ? (
                    <p className="text-sm text-muted-foreground">Sem acessos no período.</p>
                  ) : null}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium">Por semana</h3>
                <div className="space-y-1">
                  {(details.data?.weeks ?? []).map((w) => (
                    <div key={w.week} className="flex items-center justify-between text-sm">
                      <span>
                        Semana de {new Date(`${w.week}T12:00:00`).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-muted-foreground">
                        {w.days} dia(s) · ativo {formatDuration(w.activeSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium">Por mês</h3>
                <div className="space-y-1">
                  {(details.data?.months ?? []).map((m) => (
                    <div key={m.month} className="flex items-center justify-between text-sm">
                      <span>
                        {new Date(`${m.month}T12:00:00`).toLocaleDateString('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {m.days} dia(s) · ativo {formatDuration(m.activeSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

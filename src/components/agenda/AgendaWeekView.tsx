import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarEvent } from '@/hooks/useAgenda';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  days: Date[];
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (date: Date) => void;
}

const HOUR_HEIGHT = 48;
const MINUTE = HOUR_HEIGHT / 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Colunas visíveis em um grupo de sobreposição; o excedente vira um marcador "+N". */
const MAX_COLUMNS = 3;
/** Faixa (em %) do bloco de trás que fica visível à esquerda quando há sobreposição. */
const STRIP = 18;
/** Largura (em %) do bloco do fundo e redução por camada à frente. */
const BASE_WIDTH = 80;
const WIDTH_STEP = 10;
const MIN_WIDTH = 40;

interface Positioned {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

interface Overflow {
  key: string;
  top: number;
  events: CalendarEvent[];
}

interface DayLayout {
  positioned: Positioned[];
  overflows: Overflow[];
}

function layoutDay(dayEvents: CalendarEvent[], day: Date): DayLayout {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 3600_000;

  const items = dayEvents
    .map((event) => {
      const start = Math.max(new Date(event.starts_at).getTime(), dayStart);
      const end = Math.min(Math.max(new Date(event.ends_at).getTime(), start + 15 * 60_000), dayEnd);
      return { event, start, end };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  // Agrupa eventos que se cruzam no tempo para distribuir a largura da coluna.
  const groups: (typeof items)[] = [];
  let current: typeof items = [];
  let groupEnd = 0;
  for (const item of items) {
    if (current.length && item.start >= groupEnd) {
      groups.push(current);
      current = [];
      groupEnd = 0;
    }
    current.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (current.length) groups.push(current);

  const positioned: Positioned[] = [];
  const overflows: Overflow[] = [];

  for (const group of groups) {
    const columns: (typeof items)[] = [];
    for (const item of group) {
      let placed = false;
      for (const col of columns) {
        const last = col[col.length - 1]!;
        if (item.start >= last.end) {
          col.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([item]);
    }

    const visible = columns.slice(0, MAX_COLUMNS);
    const hidden = columns.slice(MAX_COLUMNS).flat();
    const total = visible.length;

    // Larguras decrescentes estilo Google: o bloco do fundo é o mais largo
    // e cada bloco à frente reduz a espessura, deslocado para a direita.
    const widthAt = (i: number) => Math.max(MIN_WIDTH, BASE_WIDTH - i * WIDTH_STEP);
    const lastWidth = widthAt(total - 1);
    const step = total > 1 ? Math.min(STRIP, (100 - lastWidth) / (total - 1)) : 0;

    visible.forEach((col, index) => {
      const width = widthAt(index);
      const left = Math.min(index * step, 100 - width);
      for (const item of col) {
        const startMin = (item.start - dayStart) / 60_000;
        const endMin = (item.end - dayStart) / 60_000;
        positioned.push({
          event: item.event,
          // Altura fiel ao tempo: 15 min = 1/4 da altura de uma hora.
          height: (endMin - startMin) * MINUTE,
          top: startMin * MINUTE,
          left,
          width,
          zIndex: 10 + index,
        });
      }
    });

    if (hidden.length) {
      // Marcador "+N" por faixa de horário: conta apenas os eventos ocultos que
      // realmente se cruzam naquele intervalo, e não a cadeia inteira do dia.
      const sorted = [...hidden].sort((a, b) => a.start - b.start || a.end - b.end);
      const boundaries = Array.from(new Set(sorted.map((i) => i.start))).sort((a, b) => a - b);
      const seen = new Set<string>();
      for (const t of boundaries) {
        const slice = sorted.filter((i) => i.start <= t && i.end > t);
        if (!slice.length) continue;
        const signature = slice.map((i) => i.event.id).join('|');
        if (seen.has(signature)) continue;
        // Ignora faixas contidas em outra já registrada (evita marcadores repetidos).
        let contained = false;
        for (const prev of seen) {
          const ids = new Set(prev.split('|'));
          if (slice.every((i) => ids.has(i.event.id))) {
            contained = true;
            break;
          }
        }
        if (contained) continue;
        seen.add(signature);
        overflows.push({
          key: `${day.toISOString()}-${t}`,
          top: ((t - dayStart) / 60_000) * MINUTE,
          events: slice.map((i) => i.event),
        });
      }
    }

  }

  return { positioned, overflows };
}

export function AgendaWeekView({ days, events, onSelectEvent, onSelectSlot }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const perDay = useMemo(
    () =>
      days.map((day) => {
        const all = events.filter((e) => {
          const start = new Date(e.starts_at);
          const end = new Date(e.ends_at);
          return isSameDay(start, day) || isSameDay(end, day) || (start < day && end > day);
        });
        return {
          day,
          allDay: all.filter((e) => e.all_day),
          layout: layoutDay(
            all.filter((e) => !e.all_day),
            day,
          ),
        };
      }),
    [days, events],
  );

  const hasAllDay = perDay.some((d) => d.allDay.length > 0);
  const cols = days.length;
  const gridCols = { gridTemplateColumns: `56px repeat(${cols}, minmax(120px, 1fr))` };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
        <div className={`flex min-h-0 flex-1 flex-col ${cols > 1 ? 'min-w-[860px]' : 'min-w-full'}`}>
          {/* Cabeçalho dos dias */}
          <div className="grid shrink-0 border-b border-border bg-card" style={gridCols}>
            <div className="border-r border-border px-2 py-2 text-[11px] text-muted-foreground">
              {format(now, 'OOOO', { locale: ptBR }).replace('GMT', 'GMT')}
            </div>
            {perDay.map(({ day }) => {
              const today = isSameDay(day, now);
              return (
                <div key={day.toISOString()} className="border-r border-border px-2 py-2 text-center last:border-r-0">
                  <div className="text-[11px] uppercase text-muted-foreground">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div
                    className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      today ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Faixa de dia inteiro */}
          {hasAllDay && (
            <div className="grid shrink-0 border-b border-border bg-muted/30" style={gridCols}>
              <div className="border-r border-border px-2 py-1.5 text-[11px] text-muted-foreground">Dia inteiro</div>
              {perDay.map(({ day, allDay }) => (
                <div key={day.toISOString()} className="space-y-1 border-r border-border p-1 last:border-r-0">
                  {allDay.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEvent(e)}
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-primary-foreground"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Grade de horários */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid" style={gridCols}>
              {/* Coluna de horas */}
              <div className="border-r border-border">
                {HOURS.map((h) => (
                  <div key={h} className="relative border-b border-border/60" style={{ height: HOUR_HEIGHT }}>
                    <span className="absolute -top-2 right-1.5 bg-card px-1 text-[11px] text-muted-foreground">
                      {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                    </span>
                  </div>
                ))}
              </div>

              {perDay.map(({ day, layout }) => {
                const today = isSameDay(day, now);
                const nowTop = (now.getHours() * 60 + now.getMinutes()) * MINUTE;
                return (
                  <div key={day.toISOString()} className="relative border-r border-border last:border-r-0">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        aria-label={`Criar compromisso às ${String(h).padStart(2, '0')}:00`}
                        onClick={() => {
                          const date = startOfDay(day);
                          date.setHours(h, 0, 0, 0);
                          onSelectSlot(date);
                        }}
                        className="block w-full border-b border-border/60 hover:bg-accent/40"
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}

                    {layout.positioned.map(({ event, top, height, left, width, zIndex }) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className="absolute flex flex-col items-stretch justify-center overflow-hidden rounded border border-card/60 px-1 text-left text-[11px] leading-tight text-primary-foreground shadow-sm transition-shadow hover:z-30 hover:shadow-md focus-visible:z-30"
                        style={{
                          top,
                          height,
                          left: `${left}%`,
                          width: `calc(${width}% - 1px)`,
                          backgroundColor: event.color,
                          zIndex,
                        }}
                        title={event.title}
                      >
                        <span
                          className={`block font-semibold ${height >= 34 ? 'line-clamp-2' : 'truncate'} ${
                            event.completed_at || event.response_status === 'declined'
                              ? 'line-through opacity-80'
                              : ''
                          } ${event.response_status === 'tentative' ? 'italic' : ''}`}
                        >
                          {event.title}
                        </span>
                        {height > 44 && (
                          <span className="block truncate opacity-90">
                            {format(new Date(event.starts_at), 'HH:mm')} – {format(new Date(event.ends_at), 'HH:mm')}
                          </span>
                        )}
                      </button>
                    ))}

                    {layout.overflows.map(({ key, top, events: hidden }) => (
                      <Popover key={key}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="absolute z-40 rounded bg-card/90 px-1 py-px text-[10px] font-semibold text-foreground/80 shadow-sm hover:bg-accent"
                            style={{ top: top + 2, right: 2 }}
                          >
                            +{hidden.length}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-2">
                          <p className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">
                            Mais compromissos neste horário
                          </p>
                          <div className="space-y-1">
                            {hidden.map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => onSelectEvent(e)}
                                className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-accent"
                              >
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: e.color }}
                                />
                                <span className="shrink-0 text-muted-foreground">
                                  {format(new Date(e.starts_at), 'HH:mm')}
                                </span>
                                <span className="truncate text-foreground">{e.title}</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}

                    {today && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-50 border-t-2 border-destructive"
                        style={{ top: nowTop }}
                      >
                        <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-destructive" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

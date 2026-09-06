import { addDays, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarEvent } from '@/hooks/useAgenda';
import { AgendaItemIcon } from '@/components/agenda/agendaItemVisual';

interface Props {
  reference: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function AgendaMonthView({ reference, events, onSelectDay, onSelectEvent }: Props) {
  const gridStart = startOfWeek(startOfMonth(reference), { weekStartsOn: 1 });
  const monthEnd = endOfMonth(reference);
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= monthEnd || days.length % 7 !== 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 41 && days.length % 7 === 0) break;
  }

  const eventsOf = (day: Date) =>
    events.filter((e) => {
      const start = new Date(e.starts_at);
      const end = new Date(e.ends_at);
      return isSameDay(start, day) || (start < day && end > day);
    });

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsOf(day);
          const outside = !isSameMonth(day, reference);
          const today = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`min-h-[92px] border-b border-r border-border p-1.5 text-left align-top transition hover:bg-accent/40 ${outside ? 'bg-muted/20' : ''}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  today ? 'bg-primary font-semibold text-primary-foreground' : outside ? 'text-muted-foreground' : 'text-foreground'
                }`}
              >
                {format(day, 'd', { locale: ptBR })}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onSelectEvent(e);
                    }}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] text-foreground hover:bg-accent"
                  >
                    <span style={{ color: e.color }} className="flex shrink-0">
                      <AgendaItemIcon type={e.item_type} />
                    </span>
                    <span
                      className={`truncate ${
                        e.completed_at || e.response_status === 'declined'
                          ? 'text-muted-foreground line-through'
                          : ''
                      } ${e.response_status === 'tentative' ? 'italic text-muted-foreground' : ''}`}
                    >
                      {!e.all_day && `${format(new Date(e.starts_at), 'HH:mm')} `}
                      {e.title}
                    </span>
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

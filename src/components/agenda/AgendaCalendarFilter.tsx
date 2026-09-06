import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { AgendaCalendar } from '@/lib/agendaCalendars';

interface Props {
  calendars: AgendaCalendar[];
  hidden: string[];
  onToggle: (id: string) => void;
  onShowAll: () => void;
  onShowOnlyMine: () => void;
}

/** Painel de agendas visíveis, no estilo "Minhas agendas" do Google. */
export function AgendaCalendarFilter({ calendars, hidden, onToggle, onShowAll, onShowOnlyMine }: Props) {
  const hiddenSet = new Set(hidden);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Minhas agendas</h2>
      </div>

      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={onShowOnlyMine}>
          Somente a minha
        </Button>
        <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={onShowAll}>
          Todas
        </Button>
      </div>

      {calendars.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum compromisso neste período.</p>
      ) : (
        <ul className="space-y-1">
          {calendars.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent/50">
                <Checkbox
                  checked={!hiddenSet.has(c.id)}
                  onCheckedChange={() => onToggle(c.id)}
                  style={{ backgroundColor: hiddenSet.has(c.id) ? undefined : c.color, borderColor: c.color }}
                  aria-label={c.label}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground" title={c.label}>
                  {c.label}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{c.count}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { CalendarEvent } from '@/hooks/useAgenda';

/** Identificador da "agenda" local (compromissos criados aqui, sem Google). */
export const LOCAL_CALENDAR_ID = '__local__';

export interface AgendaCalendar {
  id: string;
  label: string;
  color: string;
  count: number;
  isSelf: boolean;
}

/** Paleta fixa; a cor de cada agenda é escolhida de forma determinística pelo id. */
const PALETTE = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
  '#14B8A6',
  '#D946EF',
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function calendarColor(id: string) {
  if (id === LOCAL_CALENDAR_ID) return '#64748B';
  return PALETTE[hash(id) % PALETTE.length]!;
}

/** Normaliza o id da agenda de um compromisso ('primary' vira o e-mail da conta conectada). */
export function calendarIdOf(event: CalendarEvent, selfEmail?: string | null) {
  const raw = (event as unknown as { google_calendar_id?: string | null }).google_calendar_id;
  if (event.source !== 'google' || !raw) return LOCAL_CALENDAR_ID;
  if (raw === 'primary') return (selfEmail || 'primary').toLowerCase();
  return raw.toLowerCase();
}

/** Monta a lista de agendas presentes nos compromissos carregados. */
export function buildCalendarList(
  events: CalendarEvent[],
  selfEmail: string | null | undefined,
  names: Record<string, string>,
): AgendaCalendar[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const id = calendarIdOf(event, selfEmail);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const self = (selfEmail ?? '').toLowerCase();
  const list = [...counts.entries()].map(([id, count]) => ({
    id,
    count,
    isSelf: id === self,
    color: calendarColor(id),
    label:
      id === LOCAL_CALENDAR_ID
        ? 'Criados aqui'
        : names[id] || (id === self ? 'Minha agenda' : id),
  }));

  return list.sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    if ((a.id === LOCAL_CALENDAR_ID) !== (b.id === LOCAL_CALENDAR_ID)) {
      return a.id === LOCAL_CALENDAR_ID ? -1 : 1;
    }
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

export const storageKeyFor = (userId?: string | null) => `agenda:calendars:${userId ?? 'anon'}`;

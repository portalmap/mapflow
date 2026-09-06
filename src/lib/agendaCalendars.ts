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

/** Paleta base; cores são atribuídas em sequência para nunca repetir enquanto houver opções. */
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

export const LOCAL_CALENDAR_COLOR = '#64748B';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return [h, s * 100, l * 100];
}

/** Gera a cor de um índice: paleta pura no 1º ciclo, tons alternativos nos ciclos seguintes. */
export function colorForIndex(index: number) {
  const base = PALETTE[index % PALETTE.length]!;
  const cycle = Math.floor(index / PALETTE.length);
  if (cycle === 0) return base;
  const [h, s, l] = hexToHsl(base);
  // alterna entre tons mais escuros e mais claros a cada ciclo
  const direction = cycle % 2 === 1 ? -1 : 1;
  const step = Math.ceil(cycle / 2) * 14;
  const lightness = Math.min(82, Math.max(24, l + direction * step));
  return `hsl(${h} ${Math.round(s)}% ${Math.round(lightness)}%)`;
}

/** Mapa determinístico id -> cor, sem repetição dentro do mesmo conjunto de agendas. */
export function buildColorMap(ids: string[]): Record<string, string> {
  const unique = [...new Set(ids)].filter((id) => id !== LOCAL_CALENDAR_ID).sort();
  const map: Record<string, string> = { [LOCAL_CALENDAR_ID]: LOCAL_CALENDAR_COLOR };
  unique.forEach((id, i) => {
    map[id] = colorForIndex(i);
  });
  return map;
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
  const colors = buildColorMap([...counts.keys()]);
  const list = [...counts.entries()].map(([id, count]) => ({
    id,
    count,
    isSelf: id === self,
    color: colors[id] ?? LOCAL_CALENDAR_COLOR,
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

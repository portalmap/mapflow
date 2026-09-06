/**
 * Repetição do compromisso no formato do Google (RRULE), com rótulos em português.
 * Espelha as opções básicas do Google Agenda; regras avançadas criadas no Google
 * são apenas descritas aqui, sem serem alteradas.
 */

export type RecurrenceOption =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'monthly'
  | 'yearly'
  | 'custom';

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

const WEEKDAY_NAMES: Record<string, string> = {
  SU: 'domingo',
  MO: 'segunda-feira',
  TU: 'terça-feira',
  WE: 'quarta-feira',
  TH: 'quinta-feira',
  FR: 'sexta-feira',
  SA: 'sábado',
};

/** Converte a escolha do usuário em regras RRULE para o Google. */
export function buildRecurrence(option: RecurrenceOption, start: Date): string[] | null {
  switch (option) {
    case 'daily':
      return ['RRULE:FREQ=DAILY'];
    case 'weekly':
      return [`RRULE:FREQ=WEEKLY;BYDAY=${WEEKDAY_CODES[start.getDay()]}`];
    case 'weekdays':
      return ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'];
    case 'monthly':
      return [`RRULE:FREQ=MONTHLY;BYMONTHDAY=${start.getDate()}`];
    case 'yearly':
      return ['RRULE:FREQ=YEARLY'];
    default:
      return null;
  }
}

/** Identifica qual opção corresponde às regras vindas do Google. */
export function detectRecurrence(rules: string[] | null | undefined): RecurrenceOption {
  const rule = (rules ?? []).find((r) => r.toUpperCase().includes('FREQ='));
  if (!rule) return 'none';
  const upper = rule.toUpperCase();
  if (upper.includes('UNTIL=') || upper.includes('COUNT=') || upper.includes('INTERVAL=')) {
    return 'custom';
  }
  if (upper.includes('FREQ=DAILY')) return 'daily';
  if (upper.includes('FREQ=YEARLY')) return 'yearly';
  if (upper.includes('FREQ=MONTHLY')) return 'monthly';
  if (upper.includes('FREQ=WEEKLY')) {
    const days = upper.match(/BYDAY=([A-Z,]+)/)?.[1]?.split(',') ?? [];
    if (days.length === 5 && ['MO', 'TU', 'WE', 'TH', 'FR'].every((d) => days.includes(d))) {
      return 'weekdays';
    }
    return days.length > 1 ? 'custom' : 'weekly';
  }
  return 'custom';
}

/** Frase curta descrevendo a repetição, para a tela de leitura. */
export function describeRecurrence(rules: string[] | null | undefined): string | null {
  const rule = (rules ?? []).find((r) => r.toUpperCase().includes('FREQ='));
  if (!rule) return null;
  const upper = rule.toUpperCase();
  const interval = Number(upper.match(/INTERVAL=(\d+)/)?.[1] ?? 1);
  const days = (upper.match(/BYDAY=([A-Z,]+)/)?.[1]?.split(',') ?? [])
    .map((d) => WEEKDAY_NAMES[d])
    .filter(Boolean);

  let base: string;
  if (upper.includes('FREQ=DAILY')) base = interval > 1 ? `A cada ${interval} dias` : 'Todos os dias';
  else if (upper.includes('FREQ=WEEKLY')) {
    const when = days.length ? ` (${days.join(', ')})` : '';
    base = interval > 1 ? `A cada ${interval} semanas${when}` : `Toda semana${when}`;
  } else if (upper.includes('FREQ=MONTHLY'))
    base = interval > 1 ? `A cada ${interval} meses` : 'Todo mês';
  else if (upper.includes('FREQ=YEARLY'))
    base = interval > 1 ? `A cada ${interval} anos` : 'Todo ano';
  else base = 'Repete';

  const count = upper.match(/COUNT=(\d+)/)?.[1];
  if (count) base += `, ${count} vezes`;
  const until = upper.match(/UNTIL=(\d{4})(\d{2})(\d{2})/);
  if (until) base += `, até ${until[3]}/${until[2]}/${until[1]}`;
  return base;
}

export const RECURRENCE_OPTIONS: { value: RecurrenceOption; label: string }[] = [
  { value: 'none', label: 'Não se repete' },
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'weekdays', label: 'De segunda a sexta' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
];

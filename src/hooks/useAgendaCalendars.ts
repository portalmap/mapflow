import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CalendarEvent } from '@/hooks/useAgenda';
import {
  buildCalendarList,
  buildColorMap,
  calendarIdOf,
  storageKeyFor,
  type AgendaCalendar,
} from '@/lib/agendaCalendars';

/** E-mail da conta Google conectada (para resolver a agenda "primary"). */
function useConnectedEmail() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['agenda-google-email', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('calendar_google_accounts')
        .select('google_email')
        .eq('user_id', user!.id)
        .maybeSingle();
      return (data?.google_email ?? null) as string | null;
    },
  });
}

/** Nomes das pessoas por e-mail, para rotular as agendas. */
function useProfileNames() {
  return useQuery({
    queryKey: ['agenda-profile-names'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('email, full_name');
      const map: Record<string, string> = {};
      for (const p of data ?? []) {
        const email = (p as { email: string | null }).email?.toLowerCase();
        const name = (p as { full_name: string | null }).full_name;
        if (email && name) map[email] = name;
      }
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

export interface AgendaCalendarsState {
  calendars: AgendaCalendar[];
  hidden: string[];
  toggle: (id: string) => void;
  showAll: () => void;
  showOnlyMine: () => void;
  /** Compromissos visíveis, já com a cor da agenda de origem. */
  visibleEvents: CalendarEvent[];
}

export function useAgendaCalendars(events: CalendarEvent[]): AgendaCalendarsState {
  const { user } = useAuth();
  const { data: selfEmail } = useConnectedEmail();
  const { data: names = {} } = useProfileNames();
  const [hidden, setHidden] = useState<string[]>([]);
  const storageKey = storageKeyFor(user?.id);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setHidden(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setHidden([]);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      setHidden(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* armazenamento indisponível: mantém apenas em memória */
      }
    },
    [storageKey],
  );

  const calendars = useMemo(
    () => buildCalendarList(events, selfEmail, names),
    [events, selfEmail, names],
  );

  const toggle = useCallback(
    (id: string) =>
      persist(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]),
    [hidden, persist],
  );

  const showAll = useCallback(() => persist([]), [persist]);

  const showOnlyMine = useCallback(() => {
    const mine = new Set(calendars.filter((c) => c.isSelf).map((c) => c.id));
    persist(calendars.filter((c) => !mine.has(c.id)).map((c) => c.id));
  }, [calendars, persist]);

  const visibleEvents = useMemo(() => {
    const hiddenSet = new Set(hidden);
    const colors = buildColorMap(events.map((e) => calendarIdOf(e, selfEmail)));
    return events
      .filter((e) => !hiddenSet.has(calendarIdOf(e, selfEmail)))
      .map((e) => ({ ...e, color: colors[calendarIdOf(e, selfEmail)] }));
  }, [events, hidden, selfEmail]);

  return { calendars, hidden, toggle, showAll, showOnlyMine, visibleEvents };
}

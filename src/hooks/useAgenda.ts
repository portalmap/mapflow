import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { respondCalendarInvite } from '@/lib/google-calendar.functions';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** Tipos de item da agenda, espelhando o Google Agenda. */
export type AgendaItemType = 'event' | 'task' | 'out_of_office' | 'focus_time';

export const AGENDA_ITEM_TYPES: { value: AgendaItemType; label: string }[] = [
  { value: 'event', label: 'Evento' },
  { value: 'task', label: 'Tarefa' },
  { value: 'out_of_office', label: 'Ausente' },
  { value: 'focus_time', label: 'Hora de se concentrar' },
];

export const AGENDA_ITEM_LABEL: Record<AgendaItemType, string> = {
  event: 'Evento',
  task: 'Tarefa',
  out_of_office: 'Ausente',
  focus_time: 'Hora de se concentrar',
};

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string;
  reminder_minutes: number | null;
  google_event_id: string | null;
  google_html_link: string | null;
  google_task_id: string | null;
  source: string;
  item_type: AgendaItemType;
  completed_at: string | null;
  auto_decline: boolean;
  response_status: string | null;
  hangout_link: string | null;
  meet_code: string | null;
  conference_requested: boolean;
  conference_phone: string | null;
  conference_pin: string | null;
  organizer_email: string | null;
  organizer_name: string | null;
  guests_can_modify: boolean;
  guests_can_invite_others: boolean;
  guests_can_see_others: boolean;
  transparency: string;
  visibility: string;
  recurrence: string[] | null;
  recurring_event_id: string | null;
  reminders: { method: string; minutes: number }[] | null;
  can_edit: boolean;
  google_calendar_id: string | null;
}

export interface CalendarGuest {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  response_status: string;
  invite_status: string;
  invite_error: string | null;
  is_organizer: boolean;
  optional: boolean;
  is_self: boolean;
}

export interface EventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string;
  reminder_minutes: number | null;
  item_type: AgendaItemType;
  completed_at?: string | null;
  auto_decline?: boolean;
  conference_requested?: boolean;
  guests_can_modify?: boolean;
  guests_can_invite_others?: boolean;
  guests_can_see_others?: boolean;
  transparency?: string;
  visibility?: string;
  recurrence?: string[] | null;
  reminders?: { method: string; minutes: number }[] | null;
  guests: {
    user_id?: string | null;
    email?: string | null;
    display_name?: string | null;
    optional?: boolean;
  }[];
}

const AGENDA_KEY = 'agenda-events';

export function useAgendaEvents(rangeStart: Date, rangeEnd: Date) {
  const { user } = useAuth();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  return useQuery({
    queryKey: [AGENDA_KEY, user?.id, startIso, endIso],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .is('deleted_at', null)
        .lt('starts_at', endIso)
        .gt('ends_at', startIso)
        .order('starts_at');
      if (error) throw error;
      return (data ?? []) as unknown as CalendarEvent[];
    },
  });
}

export function useEventGuests(eventId?: string) {
  return useQuery({
    queryKey: ['agenda-guests', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_event_guests')
        .select('*')
        .eq('event_id', eventId!);
      if (error) throw error;
      return (data ?? []) as CalendarGuest[];
    },
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [AGENDA_KEY] });
  queryClient.invalidateQueries({ queryKey: ['agenda-guests'] });
}

async function syncGuests(eventId: string, guests: EventInput['guests']) {
  const { data: existing } = await supabase
    .from('calendar_event_guests')
    .select('id, user_id, email')
    .eq('event_id', eventId);

  const keyOf = (g: { user_id?: string | null; email?: string | null }) =>
    g.user_id ? `u:${g.user_id}` : `e:${(g.email ?? '').toLowerCase()}`;

  const wanted = new Map(guests.map((g) => [keyOf(g), g]));
  const current = new Map((existing ?? []).map((g) => [keyOf(g), g]));

  const toRemove = (existing ?? []).filter((g) => !wanted.has(keyOf(g))).map((g) => g.id);
  if (toRemove.length) {
    await supabase.from('calendar_event_guests').delete().in('id', toRemove);
  }

  const toInsert = guests
    .filter((g) => !current.has(keyOf(g)))
    .map((g) => ({
      event_id: eventId,
      user_id: g.user_id ?? null,
      email: g.email ? g.email.trim().toLowerCase() : null,
      display_name: g.display_name ?? null,
      optional: !!g.optional,
    }));
  if (toInsert.length) {
    const { error } = await supabase.from('calendar_event_guests').insert(toInsert);
    if (error) throw error;
  }
}

async function scheduleReminder(event: { id: string; user_id: string; starts_at: string; reminder_minutes: number | null }) {
  await supabase.from('calendar_event_reminders').delete().eq('event_id', event.id).eq('user_id', event.user_id);
  if (!event.reminder_minutes) return;
  const fireAt = new Date(new Date(event.starts_at).getTime() - event.reminder_minutes * 60_000);
  await supabase.from('calendar_event_reminders').insert({
    event_id: event.id,
    user_id: event.user_id,
    fire_at: fireAt.toISOString(),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: EventInput) => {
      if (!user) throw new Error('Não autenticado');
      const { guests, ...rest } = input;
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({ ...rest, user_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      const event = data as unknown as CalendarEvent;
      await syncGuests(event.id, guests);
      await scheduleReminder(event);
      return event;
    },
    onSuccess: (event) => {
      invalidate(queryClient);
      toast.success(`${AGENDA_ITEM_LABEL[event.item_type] ?? 'Compromisso'} criado`);
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao criar compromisso'),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...input }: EventInput & { id: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { guests, ...rest } = input;
      const { data, error } = await supabase
        .from('calendar_events')
        .update(rest)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      const event = data as unknown as CalendarEvent;
      await syncGuests(id, guests);
      await scheduleReminder(event);
      return event;
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Compromisso atualizado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao atualizar compromisso'),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Marca como excluído; a sincronização remove no Google e apaga o registro.
      const { data: event } = await supabase
        .from('calendar_events')
        .select('google_event_id, google_task_id')
        .eq('id', id)
        .maybeSingle();

      if (event?.google_event_id || event?.google_task_id) {
        const { error } = await supabase
          .from('calendar_events')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('calendar_events').delete().eq('id', id);
        if (error) throw error;
      }
      return id;
    },

    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Compromisso excluído');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao excluir compromisso'),
  });
}

/** Marca/desmarca uma tarefa da agenda como concluída. */
export function useToggleAgendaTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('calendar_events')
        .update({ completed_at: completed ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
    onError: (e: Error) => toast.error(e.message || 'Erro ao atualizar a tarefa'),
  });
}

/** Respostas de convite, iguais às do Google. */
export type InviteResponse = 'accepted' | 'declined' | 'tentative';

export const INVITE_RESPONSES: { value: InviteResponse; label: string }[] = [
  { value: 'accepted', label: 'Sim' },
  { value: 'declined', label: 'Não' },
  { value: 'tentative', label: 'Talvez' },
];

export const INVITE_RESPONSE_LABEL: Record<string, string> = {
  accepted: 'Sim',
  declined: 'Não',
  tentative: 'Talvez',
  needsAction: 'Sem resposta',
};

export function useRespondInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pushRsvp = useServerFn(respondCalendarInvite);

  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: InviteResponse }) => {
      if (!user) throw new Error('Não autenticado');

      // Convidado: grava na própria linha de convidado.
      const { error: guestError } = await supabase
        .from('calendar_event_guests')
        .update({ response_status: status })
        .eq('event_id', eventId)
        .eq('user_id', user.id);
      if (guestError) throw guestError;

      // Cópia do compromisso do próprio usuário (importada do Google).
      const { error: eventError } = await supabase
        .from('calendar_events')
        .update({ response_status: status })
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (eventError) throw eventError;

      // Envia a resposta ao Google (se houver conexão). Falha não desfaz o registro local.
      try {
        await pushRsvp({ data: { eventId, status } });
      } catch (e) {
        return { googleError: e instanceof Error ? e.message : String(e) };
      }
      return { googleError: null as string | null };
    },
    onSuccess: (result) => {
      invalidate(queryClient);
      if (result?.googleError) {
        toast.warning('Resposta registrada aqui, mas não foi possível enviar ao Google.');
      } else {
        toast.success('Resposta registrada');
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao responder convite'),
  });
}

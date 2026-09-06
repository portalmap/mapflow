import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, X, Plus, ExternalLink, Video } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  RECURRENCE_OPTIONS,
  buildRecurrence,
  detectRecurrence,
  type RecurrenceOption,
} from './agendaRecurrence';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { useAuth } from '@/contexts/AuthContext';
import {
  AGENDA_ITEM_TYPES,
  INVITE_RESPONSES,
  INVITE_RESPONSE_LABEL,
  useCreateEvent,
  useDeleteEvent,
  useEventGuests,
  useRespondInvite,
  useUpdateEvent,
  type AgendaItemType,
  type CalendarEvent,
} from '@/hooks/useAgenda';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#0ea5e9', '#64748b'];

const REMINDERS = [
  { value: 'none', label: 'Sem lembrete' },
  { value: '0', label: 'Na hora do compromisso' },
  { value: '5', label: '5 minutos antes' },
  { value: '10', label: '10 minutos antes' },
  { value: '15', label: '15 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
  { value: '120', label: '2 horas antes' },
  { value: '1440', label: '1 dia antes' },
  { value: '10080', label: '1 semana antes' },
];

const TITLE_PLACEHOLDER: Record<AgendaItemType, string> = {
  event: 'Reunião com o cliente',
  task: 'Enviar relatório',
  out_of_office: 'Férias',
  focus_time: 'Foco no projeto',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  /** Compromisso usado como base para uma cópia (nada é salvo até clicar em Salvar). */
  duplicateFrom?: CalendarEvent | null;
  onDuplicate?: (event: CalendarEvent) => void;
  defaultDate?: Date;
  defaultType?: AgendaItemType;
}

type GuestDraft = {
  user_id?: string | null;
  email?: string | null;
  display_name?: string | null;
  optional?: boolean;
};

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function AgendaEventDialog({ open, onOpenChange, event, defaultDate, defaultType = 'event' }: Props) {
  const { user } = useAuth();
  const { data: profiles } = useAllProfiles();
  const { data: existingGuests } = useEventGuests(event?.id);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const respondInvite = useRespondInvite();

  // Novo compromisso: sempre editável. Google: só o organizador. Local: quem criou.
  const isOwner = !event
    ? true
    : event.source === 'google'
      ? event.can_edit
      : event.user_id === user?.id;

  // Convite próprio: linha de convidado do usuário ou cópia importada do Google.
  const myGuest = useMemo(
    () => (existingGuests ?? []).find((g) => g.user_id === user?.id),
    [existingGuests, user?.id],
  );
  const canRespond = !!myGuest || !!event?.response_status;
  const myResponse = myGuest?.response_status ?? event?.response_status ?? 'needsAction';

  const [itemType, setItemType] = useState<AgendaItemType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [reminder, setReminder] = useState('none');
  const [completed, setCompleted] = useState(false);
  const [autoDecline, setAutoDecline] = useState(false);
  const [guests, setGuests] = useState<GuestDraft[]>([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('none');
  const [withMeet, setWithMeet] = useState(false);
  const [busy, setBusy] = useState(true);
  const [visibility, setVisibility] = useState('default');
  const [canModify, setCanModify] = useState(false);
  const [canInvite, setCanInvite] = useState(true);
  const [canSeeOthers, setCanSeeOthers] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (event) {
      const s = new Date(event.starts_at);
      const e = new Date(event.ends_at);
      setItemType(event.item_type ?? 'event');
      setTitle(event.title);
      setDescription(event.description ?? '');
      setLocation(event.location ?? '');
      setAllDay(event.all_day);
      setStart(event.all_day ? toDateInput(s) : toLocalInput(s));
      setEnd(event.all_day ? toDateInput(e) : toLocalInput(e));
      setColor(event.color);
      setReminder(event.reminder_minutes ? String(event.reminder_minutes) : 'none');
      setCompleted(!!event.completed_at);
      setAutoDecline(!!event.auto_decline);
      setRecurrence(detectRecurrence(event.recurrence));
      setWithMeet(!!event.hangout_link || !!event.conference_requested);
      setBusy(event.transparency !== 'transparent');
      setVisibility(event.visibility || 'default');
      setCanModify(!!event.guests_can_modify);
      setCanInvite(event.guests_can_invite_others !== false);
      setCanSeeOthers(event.guests_can_see_others !== false);
    } else {
      const base = defaultDate ? new Date(defaultDate) : new Date();
      if (!defaultDate) base.setMinutes(0, 0, 0);
      base.setSeconds(0, 0);
      const endBase = new Date(base.getTime() + 60 * 60_000);
      setItemType(defaultType);
      setTitle('');
      setDescription('');
      setLocation('');
      setAllDay(false);
      setStart(toLocalInput(base));
      setEnd(toLocalInput(endBase));
      setColor(COLORS[0]);
      setReminder('none');
      setCompleted(false);
      setAutoDecline(defaultType === 'out_of_office');
      setGuests([]);
      setRecurrence('none');
      setWithMeet(false);
      setBusy(true);
      setVisibility('default');
      setCanModify(false);
      setCanInvite(true);
      setCanSeeOthers(true);
    }
    setEmailDraft('');
  }, [open, event, defaultDate, defaultType]);

  useEffect(() => {
    if (!open || !event) return;
    setGuests(
      (existingGuests ?? []).map((g) => ({
        user_id: g.user_id,
        email: g.email,
        display_name: g.display_name,
        optional: !!g.optional,
      })),
    );
  }, [open, event, existingGuests]);

  const profileOptions = useMemo(
    () => (profiles ?? []).filter((p) => p.id !== user?.id && !guests.some((g) => g.user_id === p.id)),
    [profiles, guests, user?.id],
  );

  const guestLabel = (g: GuestDraft) => {
    if (g.user_id) {
      const p = (profiles ?? []).find((x) => x.id === g.user_id);
      return p?.full_name || 'Usuário';
    }
    return g.email ?? '';
  };

  const addEmail = () => {
    const value = emailDraft.trim().toLowerCase();
    if (!value) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error('Informe um e-mail válido');
      return;
    }
    if (guests.some((g) => g.email === value)) {
      setEmailDraft('');
      return;
    }
    setGuests((prev) => [...prev, { email: value }]);
    setEmailDraft('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Informe um título');
      return;
    }
    const startsAt = allDay ? new Date(`${start}T00:00:00`) : new Date(start);
    const endsAt = allDay ? new Date(`${end}T23:59:59`) : new Date(end);
    if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      toast.error('Informe datas válidas');
      return;
    }
    if (endsAt <= startsAt) {
      toast.error('O fim deve ser depois do início');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location: itemType === 'event' ? location.trim() || null : null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      all_day: allDay,
      color,
      reminder_minutes: reminder === 'none' ? null : Number(reminder),
      item_type: itemType,
      completed_at: itemType === 'task' && completed ? new Date().toISOString() : null,
      auto_decline: itemType === 'out_of_office' ? autoDecline : false,
      reminders: reminder === 'none' ? null : [{ method: 'popup', minutes: Number(reminder) }],
      conference_requested: itemType === 'event' ? withMeet : false,
      transparency: busy ? 'opaque' : 'transparent',
      visibility,
      guests_can_modify: itemType === 'event' ? canModify : false,
      guests_can_invite_others: itemType === 'event' ? canInvite : true,
      guests_can_see_others: itemType === 'event' ? canSeeOthers : true,
      recurrence: event?.recurring_event_id
        ? (event.recurrence ?? null)
        : buildRecurrence(recurrence, startsAt),
      guests: itemType === 'event' ? guests : [],
    };

    if (event) {
      await updateEvent.mutateAsync({ id: event.id, ...payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    await deleteEvent.mutateAsync(event.id);
    onOpenChange(false);
  };

  const saving = createEvent.isPending || updateEvent.isPending;
  const isEventType = itemType === 'event';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar compromisso' : 'Novo item da agenda'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-1.5">
              {AGENDA_ITEM_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={itemType === t.value ? 'default' : 'outline'}
                  disabled={!isOwner}
                  onClick={() => {
                    setItemType(t.value);
                    if (t.value === 'out_of_office') setAutoDecline(true);
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isOwner}
              placeholder={TITLE_PLACEHOLDER[itemType]}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label className="text-sm">Dia inteiro</Label>
            <Switch checked={allDay} disabled={!isOwner} onCheckedChange={(v) => {
              setAllDay(v);
              const s = start ? new Date(start.length === 10 ? `${start}T09:00` : start) : new Date();
              const e = end ? new Date(end.length === 10 ? `${end}T10:00` : end) : new Date();
              setStart(v ? toDateInput(s) : toLocalInput(s));
              setEnd(v ? toDateInput(e) : toLocalInput(e));
            }} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input
                type={allDay ? 'date' : 'datetime-local'}
                value={start}
                disabled={!isOwner}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input
                type={allDay ? 'date' : 'datetime-local'}
                value={end}
                disabled={!isOwner}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          {itemType === 'task' && (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label className="text-sm">Tarefa concluída</Label>
              <Switch checked={completed} disabled={!isOwner} onCheckedChange={setCompleted} />
            </div>
          )}

          {itemType === 'out_of_office' && (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label className="text-sm">Recusar convites automaticamente</Label>
              <Switch checked={autoDecline} disabled={!isOwner} onCheckedChange={setAutoDecline} />
            </div>
          )}

          {isEventType && (
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={location} disabled={!isOwner} onChange={(e) => setLocation(e.target.value)} placeholder="Sala, endereço ou link" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} disabled={!isOwner} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={!isOwner}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition ${color === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lembrete</Label>
              <Select value={reminder} onValueChange={setReminder} disabled={!isOwner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDERS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEventType && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4" /> Videoconferência do Google Meet
                </Label>
                <Switch
                  checked={withMeet}
                  disabled={!isOwner || !!event?.recurring_event_id}
                  onCheckedChange={setWithMeet}
                />
              </div>
              {event?.hangout_link && (
                <a
                  href={event.hangout_link}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-muted-foreground hover:text-foreground"
                >
                  {event.hangout_link}
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                O link é criado pelo Google ao salvar e enviado aos convidados.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Repetição</Label>
              <Select
                value={recurrence}
                onValueChange={(v) => setRecurrence(v as RecurrenceOption)}
                disabled={!isOwner || !!event?.recurring_event_id || recurrence === 'custom'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                  {recurrence === 'custom' && (
                    <SelectItem value="custom">Personalizada (definida no Google)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {event?.recurring_event_id && (
                <p className="text-xs text-muted-foreground">
                  Esta é uma ocorrência da série; a alteração vale só para este dia.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Visibilidade</Label>
              <Select value={visibility} onValueChange={setVisibility} disabled={!isOwner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão da agenda</SelectItem>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="private">Privado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-sm">Mostrar como ocupado</Label>
              <p className="text-xs text-muted-foreground">
                Desligue para aparecer como disponível na sua agenda.
              </p>
            </div>
            <Switch checked={busy} disabled={!isOwner} onCheckedChange={setBusy} />
          </div>

          {event && isEventType && canRespond && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="text-sm font-medium">Você vai participar?</Label>
              <div className="flex flex-wrap gap-2">
                {INVITE_RESPONSES.map((r) => (
                  <Button
                    key={r.value}
                    type="button"
                    size="sm"
                    variant={myResponse === r.value ? 'default' : 'outline'}
                    disabled={respondInvite.isPending}
                    onClick={() => respondInvite.mutate({ eventId: event.id, status: r.value })}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                A sua resposta é enviada ao Google e aos organizadores.
              </p>
            </div>
          )}

          {event && isEventType && (existingGuests?.length ?? 0) > 0 && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="text-sm font-medium">Respostas dos convidados</Label>
              <ul className="space-y-1 text-xs">
                {(existingGuests ?? []).map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">
                      {g.display_name || g.email || 'Convidado'}
                    </span>
                    <Badge variant="secondary">
                      {INVITE_RESPONSE_LABEL[g.response_status] ?? 'Sem resposta'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isOwner && isEventType && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <Label className="text-sm font-medium">Convidados</Label>
              <p className="text-xs text-muted-foreground">
                Cada convidado recebe o convite por e-mail quando a sua conta do Google estiver conectada.
              </p>

              <Select value="" onValueChange={(id) => setGuests((prev) => [...prev, { user_id: id }])}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar pessoa do sistema" />
                </SelectTrigger>
                <SelectContent>
                  {profileOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || 'Sem nome'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  placeholder="convidado@empresa.com"
                />
                <Button type="button" variant="outline" size="icon" onClick={addEmail}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Separator />
              <Label className="text-sm font-medium">Os convidados podem</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-normal">Editar o compromisso</Label>
                  <Switch checked={canModify} onCheckedChange={setCanModify} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-normal">Convidar outras pessoas</Label>
                  <Switch checked={canInvite} onCheckedChange={setCanInvite} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-normal">Ver a lista de convidados</Label>
                  <Switch checked={canSeeOthers} onCheckedChange={setCanSeeOthers} />
                </div>
              </div>

              {guests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {guests.map((g, i) => (
                    <Badge key={`${guestLabel(g)}-${i}`} variant="secondary" className="gap-1">
                      {guestLabel(g)}
                      <button type="button" onClick={() => setGuests((prev) => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {event?.google_html_link && (
            <a
              href={event.google_html_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Abrir no Google Agenda
            </a>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {event && isOwner ? (
            <Button variant="ghost" className="text-destructive" onClick={handleDelete} disabled={deleteEvent.isPending}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            {isOwner && (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

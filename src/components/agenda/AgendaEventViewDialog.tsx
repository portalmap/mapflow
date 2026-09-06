import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bell,
  CalendarClock,
  Copy,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Repeat,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { describeRecurrence } from './agendaRecurrence';
import {
  AGENDA_ITEM_LABEL,
  INVITE_RESPONSES,
  INVITE_RESPONSE_LABEL,
  useDeleteEvent,
  useEventGuests,
  useRespondInvite,
  type CalendarEvent,
} from '@/hooks/useAgenda';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDuplicate?: (event: CalendarEvent) => void;
}

function periodLabel(event: CalendarEvent) {
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  if (event.all_day) {
    const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
    const day = format(start, "EEEE, d 'de' MMMM", { locale: ptBR });
    return sameDay
      ? `${day} · dia inteiro`
      : `${day} até ${format(end, "d 'de' MMMM", { locale: ptBR })} · dia inteiro`;
  }
  return `${format(start, "EEEE, d 'de' MMMM", { locale: ptBR })} · ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
}

function reminderLabel(minutes: number) {
  if (minutes === 0) return 'Na hora do compromisso';
  if (minutes % 1440 === 0) return `${minutes / 1440} dia(s) antes`;
  if (minutes % 60 === 0) return `${minutes / 60} hora(s) antes`;
  return `${minutes} minutos antes`;
}

export function AgendaEventViewDialog({ open, onOpenChange, event, onEdit, onDuplicate }: Props) {
  const { user } = useAuth();
  const { data: guests } = useEventGuests(event?.id);
  const deleteEvent = useDeleteEvent();
  const respondInvite = useRespondInvite();

  const myGuest = useMemo(
    () => (guests ?? []).find((g) => g.is_self || g.user_id === user?.id),
    [guests, user?.id],
  );

  if (!event) return null;

  const isOwner = event.user_id === user?.id;
  // Google: apenas o organizador edita/exclui. Local: quem criou.
  const canEdit = event.source === 'google' ? event.can_edit : isOwner;
  const canRespond = !!myGuest || !!event.response_status;
  const myResponse = myGuest?.response_status ?? event.response_status ?? 'needsAction';
  const recurrence = describeRecurrence(event.recurrence);
  const reminders = event.reminders?.length
    ? event.reminders
    : event.reminder_minutes
      ? [{ method: 'popup', minutes: event.reminder_minutes }]
      : [];

  const accepted = (guests ?? []).filter((g) => g.response_status === 'accepted').length;
  const declined = (guests ?? []).filter((g) => g.response_status === 'declined').length;
  const pending = (guests ?? []).filter(
    (g) => g.response_status !== 'accepted' && g.response_status !== 'declined',
  ).length;

  const copyMeet = async () => {
    if (!event.hangout_link) return;
    try {
      await navigator.clipboard.writeText(event.hangout_link);
      toast.success('Link da reunião copiado');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <span
              className="mt-1.5 h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: event.color }}
            />
            <div className="min-w-0">
              <DialogTitle className="text-left text-lg leading-snug">{event.title}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">{periodLabel(event)}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{AGENDA_ITEM_LABEL[event.item_type] ?? 'Evento'}</Badge>
            {event.source === 'google' && <Badge variant="outline">Google Agenda</Badge>}
            {event.transparency === 'transparent' && <Badge variant="outline">Disponível</Badge>}
            {event.visibility === 'private' && <Badge variant="outline">Privado</Badge>}
          </div>

          {recurrence && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Repeat className="h-4 w-4 shrink-0" /> {recurrence}
            </p>
          )}

          {event.hangout_link && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="flex items-center gap-2 font-medium">
                <Video className="h-4 w-4 shrink-0" /> Google Meet
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <a href={event.hangout_link} target="_blank" rel="noreferrer">
                    Entrar na reunião
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={copyMeet}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar link
                </Button>
              </div>
              {event.meet_code && (
                <p className="text-xs text-muted-foreground">Código: {event.meet_code}</p>
              )}
              {event.conference_phone && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {event.conference_phone}
                  {event.conference_pin ? ` · PIN ${event.conference_pin}` : ''}
                </p>
              )}
            </div>
          )}

          {event.location && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 break-words">{event.location}</span>
            </p>
          )}

          {reminders.length > 0 && (
            <div className="space-y-1">
              {reminders.map((r, i) => (
                <p key={`${r.method}-${r.minutes}-${i}`} className="flex items-center gap-2 text-muted-foreground">
                  <Bell className="h-4 w-4 shrink-0" />
                  {r.method === 'email' ? 'E-mail' : 'Notificação'} · {reminderLabel(Number(r.minutes))}
                </p>
              ))}
            </div>
          )}

          {(event.organizer_name || event.organizer_email) && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4 shrink-0" />
              Organizador: {event.organizer_name || event.organizer_email}
            </p>
          )}

          {(guests?.length ?? 0) > 0 && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 shrink-0" /> {guests!.length} convidado(s)
              </p>
              <p className="text-xs text-muted-foreground">
                {accepted} sim · {declined} não · {pending} sem resposta
              </p>
              <Separator />
              <ul className="space-y-1.5">
                {guests!.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {g.display_name || g.email || 'Convidado'}
                      {g.is_organizer && (
                        <span className="ml-1 text-xs text-muted-foreground">· organizador</span>
                      )}
                      {g.optional && (
                        <span className="ml-1 text-xs text-muted-foreground">· opcional</span>
                      )}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {INVITE_RESPONSE_LABEL[g.response_status] ?? 'Sem resposta'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.description && (
            <div className="space-y-1">
              <p className="font-medium">Descrição</p>
              <div
                className="whitespace-pre-wrap break-words text-muted-foreground [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitize(event.description) }}
              />
            </div>
          )}

          {canRespond && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="font-medium">Você vai participar?</p>
              <div className="flex flex-wrap gap-2">
                {INVITE_RESPONSES.map((r) => (
                  <Button
                    key={r.value}
                    size="sm"
                    variant={myResponse === r.value ? 'default' : 'outline'}
                    disabled={respondInvite.isPending}
                    onClick={() => respondInvite.mutate({ eventId: event.id, status: r.value })}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {event.google_html_link && (
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
          {canEdit ? (
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={deleteEvent.isPending}
              onClick={async () => {
                await deleteEvent.mutateAsync(event.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {canEdit && onDuplicate && (
              <Button variant="outline" onClick={() => onDuplicate(event)}>
                <CopyPlus className="mr-2 h-4 w-4" /> Duplicar
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => onEdit(event)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Descrições do Google podem vir com HTML simples; removemos o que é executável. */
function sanitize(html: string) {
  return html
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, '')
    .replace(/ on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

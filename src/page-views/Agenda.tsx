import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  Maximize2,
  Minimize2,
  ListFilter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgendaMonthView } from '@/components/agenda/AgendaMonthView';
import { AgendaWeekView } from '@/components/agenda/AgendaWeekView';
import { AgendaEventDialog } from '@/components/agenda/AgendaEventDialog';
import { AgendaEventViewDialog } from '@/components/agenda/AgendaEventViewDialog';
import { AgendaCalendarFilter } from '@/components/agenda/AgendaCalendarFilter';
import { GoogleAgendaButton } from '@/components/agenda/GoogleAgendaButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AGENDA_ITEM_TYPES,
  useAgendaEvents,
  type AgendaItemType,
  type CalendarEvent,
} from '@/hooks/useAgenda';
import { useAgendaCalendars } from '@/hooks/useAgendaCalendars';
import { useFullscreen } from '@/hooks/useFullscreen';


type ViewMode = 'month' | 'week' | 'day';

export default function Agenda() {
  const [view, setView] = useState<ViewMode>('month');
  const [reference, setReference] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);
  const [defaultType, setDefaultType] = useState<AgendaItemType>('event');
  const { ref: fullscreenRef, isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(reference), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(reference), { weekStartsOn: 1 });
      return { rangeStart: start, rangeEnd: end, days: [] as Date[] };
    }
    if (view === 'week') {
      const start = startOfWeek(reference, { weekStartsOn: 1 });
      const end = endOfWeek(reference, { weekStartsOn: 1 });
      return {
        rangeStart: start,
        rangeEnd: end,
        days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
      };
    }
    return { rangeStart: startOfDay(reference), rangeEnd: endOfDay(reference), days: [startOfDay(reference)] };
  }, [view, reference]);

  const { data: events = [], isLoading } = useAgendaEvents(rangeStart, rangeEnd);
  const { calendars, hidden, toggle, showAll, showOnlyMine, visibleEvents } =
    useAgendaCalendars(events);


  const goPrev = () => {
    if (view === 'month') setReference((d) => subMonths(d, 1));
    else if (view === 'week') setReference((d) => subWeeks(d, 1));
    else setReference((d) => addDays(d, -1));
  };

  const goNext = () => {
    if (view === 'month') setReference((d) => addMonths(d, 1));
    else if (view === 'week') setReference((d) => addWeeks(d, 1));
    else setReference((d) => addDays(d, 1));
  };

  const openNew = (date?: Date, type: AgendaItemType = 'event') => {
    setSelectedEvent(null);
    setDuplicateSource(null);
    setDefaultDate(date);
    setDefaultType(type);
    setDialogOpen(true);
  };

  // Primeiro clique: cartão de leitura. A edição abre pelo botão "Editar".
  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDefaultDate(undefined);
    setViewOpen(true);
  };

  const editEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDuplicateSource(null);
    setDefaultDate(undefined);
    setViewOpen(false);
    setDialogOpen(true);
  };

  // Duplicar: abre a edição com uma cópia preenchida; nada é salvo até confirmar.
  const duplicateEvent = (event: CalendarEvent) => {
    setSelectedEvent(null);
    setDuplicateSource(event);
    setDefaultDate(undefined);
    setViewOpen(false);
    setDialogOpen(true);
  };

  const periodLabel = useMemo(() => {
    if (view === 'month') return format(reference, "MMMM 'de' yyyy", { locale: ptBR });
    if (view === 'week') {
      const start = startOfWeek(reference, { weekStartsOn: 1 });
      const end = endOfWeek(reference, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(reference, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [view, reference]);

  return (
    <div
      ref={fullscreenRef}
      className={cn(
        'flex min-h-0 flex-col gap-3 bg-background',
        isFullscreen ? 'h-screen w-screen overflow-hidden p-4' : 'h-full w-full p-3 md:p-4'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setReference(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-1 text-sm font-medium capitalize text-foreground">{periodLabel}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Expandir tela cheia'}
            title={isFullscreen ? 'Sair da tela cheia' : 'Expandir tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <ListFilter className="mr-1.5 h-4 w-4" />
                Agendas
                {hidden.length > 0 && (
                  <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                    {hidden.length} oculta{hidden.length > 1 ? 's' : ''}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-[70vh] w-72 overflow-y-auto p-3">
              <AgendaCalendarFilter
                calendars={calendars}
                hidden={hidden}
                onToggle={toggle}
                onShowAll={showAll}
                onShowOnlyMine={showOnlyMine}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <GoogleAgendaButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Criar
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {AGENDA_ITEM_TYPES.map((t) => (
                <DropdownMenuItem key={t.value} onClick={() => openNew(undefined, t.value)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="ml-auto">
          <TabsList>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="day">Dia</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Carregando agenda...
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="min-w-0 flex-1">
            {view === 'month' ? (
              <AgendaMonthView
                reference={reference}
                events={visibleEvents}
                onSelectDay={(day) => openNew(new Date(day.setHours(9, 0, 0, 0)))}
                onSelectEvent={openEvent}
              />
            ) : (
              <AgendaWeekView
                days={days}
                events={visibleEvents}
                onSelectEvent={openEvent}
                onSelectSlot={(date) => openNew(date)}
              />
            )}
          </div>
        </div>
      )}


      <AgendaEventViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        event={selectedEvent}
        onEdit={editEvent}
        onDuplicate={duplicateEvent}
      />

      <AgendaEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        duplicateFrom={duplicateSource}
        onDuplicate={duplicateEvent}
        defaultDate={defaultDate}
        defaultType={defaultType}
      />
    </div>
  );
}

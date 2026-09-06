ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS recurrence text[],
  ADD COLUMN IF NOT EXISTS recurring_event_id text,
  ADD COLUMN IF NOT EXISTS organizer_email text,
  ADD COLUMN IF NOT EXISTS organizer_name text,
  ADD COLUMN IF NOT EXISTS guests_can_modify boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guests_can_invite_others boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guests_can_see_others boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS transparency text NOT NULL DEFAULT 'opaque',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS reminders jsonb,
  ADD COLUMN IF NOT EXISTS conference_phone text,
  ADD COLUMN IF NOT EXISTS conference_pin text,
  ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT true;

ALTER TABLE public.calendar_event_guests
  ADD COLUMN IF NOT EXISTS is_organizer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS optional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_self boolean NOT NULL DEFAULT false;
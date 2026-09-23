DROP INDEX IF EXISTS public.idx_calendar_events_ical_uid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_user_ical_uid_start
  ON public.calendar_events (user_id, google_ical_uid, starts_at)
  WHERE google_ical_uid IS NOT NULL AND deleted_at IS NULL;
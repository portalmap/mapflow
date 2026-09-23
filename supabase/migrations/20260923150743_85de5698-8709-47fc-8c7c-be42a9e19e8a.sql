ALTER TABLE public.calendar_google_accounts
  ADD COLUMN IF NOT EXISTS full_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS watch_channel_id text,
  ADD COLUMN IF NOT EXISTS watch_resource_id text,
  ADD COLUMN IF NOT EXISTS watch_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS watch_token text;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE public.user_activity_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  state text NOT NULL DEFAULT 'active',
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_activity_sessions TO authenticated;
GRANT ALL ON public.user_activity_sessions TO service_role;

ALTER TABLE public.user_activity_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_own_select" ON public.user_activity_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "activity_own_insert" ON public.user_activity_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "activity_own_update" ON public.user_activity_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_activity_user_started ON public.user_activity_sessions (user_id, started_at DESC);
CREATE INDEX idx_activity_day ON public.user_activity_sessions (day);
CREATE INDEX idx_activity_open ON public.user_activity_sessions (user_id, ended_at) WHERE ended_at IS NULL;

CREATE TRIGGER trg_activity_updated_at
  BEFORE UPDATE ON public.user_activity_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.state_validate_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.state NOT IN ('active','idle') THEN
    RAISE EXCEPTION 'state inválido: %', NEW.state;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_state_valid
  BEFORE INSERT OR UPDATE ON public.user_activity_sessions
  FOR EACH ROW EXECUTE FUNCTION public.state_validate_activity();

-- Relatório agregado por pessoa
CREATE OR REPLACE FUNCTION public.get_flow_usage_report(_from timestamptz, _to timestamptz)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  span_seconds numeric;
BEGIN
  IF NOT public.can_access_management(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  span_seconds := GREATEST(0, EXTRACT(EPOCH FROM (LEAST(_to, now()) - _from)));

  WITH clipped AS (
    SELECT
      s.user_id,
      s.state,
      GREATEST(s.started_at, _from) AS s_start,
      LEAST(COALESCE(s.ended_at, s.last_seen_at), _to) AS s_end,
      (COALESCE(s.ended_at, s.last_seen_at) AT TIME ZONE 'America/Sao_Paulo')::date AS s_day,
      s.last_seen_at
    FROM public.user_activity_sessions s
    WHERE s.started_at < _to
      AND COALESCE(s.ended_at, s.last_seen_at) > _from
  ),
  spans AS (
    SELECT
      user_id, state, s_day, last_seen_at,
      GREATEST(0, EXTRACT(EPOCH FROM (s_end - s_start))) AS seconds
    FROM clipped
  ),
  per_user AS (
    SELECT
      user_id,
      SUM(seconds) FILTER (WHERE state = 'active') AS active_seconds,
      SUM(seconds) FILTER (WHERE state = 'idle') AS idle_seconds,
      COUNT(*) AS session_count,
      COUNT(DISTINCT s_day) AS active_days,
      MAX(last_seen_at) AS last_seen
    FROM spans
    GROUP BY user_id
  ),
  people AS (
    SELECT p.id, COALESCE(p.full_name, 'Sem nome') AS full_name, p.avatar_url
    FROM public.profiles p
  )
  SELECT json_build_object(
    'from', _from,
    'to', _to,
    'spanSeconds', span_seconds,
    'users', COALESCE((
      SELECT json_agg(row_to_json(x) ORDER BY x."activeSeconds" DESC NULLS LAST)
      FROM (
        SELECT
          pe.id AS "userId",
          pe.full_name AS "userName",
          pe.avatar_url AS "avatarUrl",
          COALESCE(pu.active_seconds, 0)::bigint AS "activeSeconds",
          COALESCE(pu.idle_seconds, 0)::bigint AS "idleSeconds",
          GREATEST(0, span_seconds - COALESCE(pu.active_seconds, 0) - COALESCE(pu.idle_seconds, 0))::bigint AS "offlineSeconds",
          COALESCE(pu.session_count, 0)::int AS "sessionCount",
          COALESCE(pu.active_days, 0)::int AS "activeDays",
          pu.last_seen AS "lastSeenAt",
          CASE WHEN COALESCE(pu.active_days,0) > 0
            THEN ROUND((COALESCE(pu.active_seconds,0) + COALESCE(pu.idle_seconds,0)) / pu.active_days)::bigint
            ELSE 0 END AS "avgPerDaySeconds",
          CASE WHEN COALESCE(pu.session_count,0) > 0
            THEN ROUND((COALESCE(pu.active_seconds,0) + COALESCE(pu.idle_seconds,0)) / pu.session_count)::bigint
            ELSE 0 END AS "avgPerSessionSeconds",
          CASE WHEN span_seconds > 0
            THEN ROUND(COALESCE(pu.active_days,0)::numeric * 7 / GREATEST(1, span_seconds / 86400), 1)
            ELSE 0 END AS "daysPerWeek"
        FROM people pe
        LEFT JOIN per_user pu ON pu.user_id = pe.id
      ) x
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Detalhe por pessoa: por dia, semana e mês
CREATE OR REPLACE FUNCTION public.get_flow_usage_details(_user_id uuid, _from timestamptz, _to timestamptz)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.can_access_management(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH spans AS (
    SELECT
      s.state,
      (COALESCE(s.ended_at, s.last_seen_at) AT TIME ZONE 'America/Sao_Paulo')::date AS s_day,
      GREATEST(0, EXTRACT(EPOCH FROM (
        LEAST(COALESCE(s.ended_at, s.last_seen_at), _to) - GREATEST(s.started_at, _from)
      ))) AS seconds
    FROM public.user_activity_sessions s
    WHERE s.user_id = _user_id
      AND s.started_at < _to
      AND COALESCE(s.ended_at, s.last_seen_at) > _from
  ),
  by_day AS (
    SELECT s_day,
      SUM(seconds) FILTER (WHERE state = 'active') AS active_seconds,
      SUM(seconds) FILTER (WHERE state = 'idle') AS idle_seconds
    FROM spans GROUP BY s_day
  )
  SELECT json_build_object(
    'days', COALESCE((
      SELECT json_agg(json_build_object(
        'day', d.s_day,
        'activeSeconds', COALESCE(d.active_seconds,0)::bigint,
        'idleSeconds', COALESCE(d.idle_seconds,0)::bigint
      ) ORDER BY d.s_day)
      FROM by_day d
    ), '[]'::json),
    'weeks', COALESCE((
      SELECT json_agg(json_build_object(
        'week', w.wk,
        'activeSeconds', w.active_seconds,
        'idleSeconds', w.idle_seconds,
        'days', w.days
      ) ORDER BY w.wk)
      FROM (
        SELECT date_trunc('week', d.s_day)::date AS wk,
          SUM(COALESCE(d.active_seconds,0))::bigint AS active_seconds,
          SUM(COALESCE(d.idle_seconds,0))::bigint AS idle_seconds,
          COUNT(*)::int AS days
        FROM by_day d GROUP BY 1
      ) w
    ), '[]'::json),
    'months', COALESCE((
      SELECT json_agg(json_build_object(
        'month', m.mo,
        'activeSeconds', m.active_seconds,
        'idleSeconds', m.idle_seconds,
        'days', m.days
      ) ORDER BY m.mo)
      FROM (
        SELECT date_trunc('month', d.s_day)::date AS mo,
          SUM(COALESCE(d.active_seconds,0))::bigint AS active_seconds,
          SUM(COALESCE(d.idle_seconds,0))::bigint AS idle_seconds,
          COUNT(*)::int AS days
        FROM by_day d GROUP BY 1
      ) m
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_flow_usage_report(timestamptz, timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.get_flow_usage_details(uuid, timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.get_flow_usage_report(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_flow_usage_details(uuid, timestamptz, timestamptz) TO authenticated, service_role;
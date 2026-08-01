-- ============ ALERT CHANNELS ============
CREATE TYPE public.alert_channel_kind AS ENUM ('in_app', 'email', 'slack');

CREATE TABLE public.alert_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.alert_channel_kind NOT NULL,
  target TEXT,
  label TEXT,
  events TEXT[] NOT NULL DEFAULT ARRAY['spend_limit','dlq_failure']::text[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_channels TO authenticated;
GRANT ALL ON public.alert_channels TO service_role;

ALTER TABLE public.alert_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view alert channels" ON public.alert_channels
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers insert alert channels" ON public.alert_channels
  FOR INSERT TO authenticated WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers update alert channels" ON public.alert_channels
  FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers delete alert channels" ON public.alert_channels
  FOR DELETE TO authenticated USING (public.can_manage(org_id));

CREATE TRIGGER update_alert_channels_updated_at
  BEFORE UPDATE ON public.alert_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX alert_channels_unique_target
  ON public.alert_channels (org_id, kind, COALESCE(target, ''));

-- Every workspace starts with in-app alerts on.
INSERT INTO public.alert_channels (org_id, kind, label, created_by)
SELECT o.id, 'in_app', 'In-app notifications', o.created_by FROM public.organizations o;

-- ============ WEBHOOK IDEMPOTENCY ============
ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS replay_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replay_of UUID REFERENCES public.webhook_deliveries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_replayed_at TIMESTAMP WITH TIME ZONE;

UPDATE public.webhook_deliveries
SET idempotency_key = COALESCE(idempotency_key, run_id::text || ':' || event)
WHERE idempotency_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_deliveries_idempotency
  ON public.webhook_deliveries (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============ RETENTION ============
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS last_archive_run_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION public.retention_preview(_org_id UUID, _days INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d INTEGER;
  cutoff TIMESTAMPTZ;
  live RECORD;
  stale RECORD;
  arch RECORD;
  recent RECORD;
BEGIN
  IF NOT public.is_org_member(_org_id) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  SELECT COALESCE(_days, log_retention_days, 30) INTO d
  FROM public.org_settings WHERE org_id = _org_id;
  d := COALESCE(d, COALESCE(_days, 30));
  cutoff := now() - make_interval(days => d);

  SELECT count(*)::bigint AS c,
         COALESCE(sum(pg_column_size(message) + 96), 0)::bigint AS b,
         min(created_at) AS oldest,
         max(created_at) AS newest
  INTO live
  FROM public.run_logs WHERE org_id = _org_id;

  SELECT count(*)::bigint AS c,
         COALESCE(sum(pg_column_size(message) + 96), 0)::bigint AS b,
         min(created_at) AS oldest,
         max(created_at) AS newest
  INTO stale
  FROM public.run_logs WHERE org_id = _org_id AND created_at < cutoff;

  SELECT count(*)::bigint AS c,
         COALESCE(sum(pg_column_size(message) + 96), 0)::bigint AS b
  INTO arch
  FROM public.run_log_archive WHERE org_id = _org_id;

  SELECT count(*)::bigint AS c,
         COALESCE(sum(pg_column_size(message) + 96), 0)::bigint AS b
  INTO recent
  FROM public.run_logs
  WHERE org_id = _org_id AND created_at >= now() - interval '7 days';

  RETURN jsonb_build_object(
    'retention_days', d,
    'cutoff', cutoff,
    'live_count', live.c,
    'live_bytes', live.b,
    'live_oldest', live.oldest,
    'live_newest', live.newest,
    'stale_count', stale.c,
    'stale_bytes', stale.b,
    'stale_oldest', stale.oldest,
    'stale_newest', stale.newest,
    'archived_count', arch.c,
    'archived_bytes', arch.b,
    'events_per_day', round((recent.c / 7.0)::numeric, 2),
    'bytes_per_day', round((recent.b / 7.0)::numeric, 2)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.retention_preview(UUID, INTEGER) TO authenticated;
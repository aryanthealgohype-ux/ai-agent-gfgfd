-- ============ 1. SPEND GUARDRAILS ============
CREATE TYPE public.spend_period AS ENUM ('daily', 'monthly');

CREATE TABLE public.spend_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  period public.spend_period NOT NULL,
  limit_usd numeric NOT NULL CHECK (limit_usd > 0),
  hard_stop boolean NOT NULL DEFAULT true,
  alert_threshold_pct smallint NOT NULL DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 1 AND 100),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spend_limits_scope_period_key UNIQUE NULLS NOT DISTINCT (org_id, agent_id, period)
);
CREATE INDEX spend_limits_org_idx ON public.spend_limits(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spend_limits TO authenticated;
GRANT ALL ON public.spend_limits TO service_role;
ALTER TABLE public.spend_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view spend limits" ON public.spend_limits
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers insert spend limits" ON public.spend_limits
  FOR INSERT TO authenticated WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers update spend limits" ON public.spend_limits
  FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers delete spend limits" ON public.spend_limits
  FOR DELETE TO authenticated USING (public.can_manage(org_id));

CREATE TRIGGER update_spend_limits_updated_at BEFORE UPDATE ON public.spend_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Records each time a limit warned or blocked, so alerts are not repeated per window.
CREATE TABLE public.spend_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  limit_id uuid REFERENCES public.spend_limits(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  period public.spend_period NOT NULL,
  window_start date NOT NULL,
  kind text NOT NULL DEFAULT 'warning',
  spend_usd numeric NOT NULL DEFAULT 0,
  limit_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spend_alerts_window_key UNIQUE NULLS NOT DISTINCT (org_id, limit_id, window_start, kind)
);
CREATE INDEX spend_alerts_org_created_idx ON public.spend_alerts(org_id, created_at DESC);

GRANT SELECT ON public.spend_alerts TO authenticated;
GRANT ALL ON public.spend_alerts TO service_role;
ALTER TABLE public.spend_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view spend alerts" ON public.spend_alerts
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));

-- ============ 2. WEBHOOK DELIVERY QUEUE + DEAD LETTER ============
CREATE TABLE public.webhook_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  url text NOT NULL,
  event text NOT NULL DEFAULT 'agent.run.completed',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_status_code integer,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhook_deliveries_org_status_idx ON public.webhook_deliveries(org_id, status, next_attempt_at);
CREATE INDEX webhook_deliveries_run_idx ON public.webhook_deliveries(run_id);

GRANT SELECT, UPDATE ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view deliveries" ON public.webhook_deliveries
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers requeue deliveries" ON public.webhook_deliveries
  FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

CREATE TRIGGER update_webhook_deliveries_updated_at BEFORE UPDATE ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. RUN LOG RETENTION ============
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS log_retention_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS archive_logs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_retention_run_at timestamptz;

ALTER TABLE public.org_settings
  ADD CONSTRAINT org_settings_retention_range CHECK (log_retention_days BETWEEN 1 AND 3650);

CREATE TABLE public.run_log_archive (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id uuid,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  logged_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX run_log_archive_org_logged_idx ON public.run_log_archive(org_id, logged_at DESC);
CREATE INDEX run_log_archive_run_idx ON public.run_log_archive(run_id);

GRANT SELECT ON public.run_log_archive TO authenticated;
GRANT ALL ON public.run_log_archive TO service_role;
ALTER TABLE public.run_log_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view archived logs" ON public.run_log_archive
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));

-- Applies each workspace's retention policy: archive then delete, or delete outright.
CREATE OR REPLACE FUNCTION public.apply_log_retention()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  cutoff timestamptz;
  removed integer := 0;
  batch integer;
BEGIN
  FOR s IN SELECT org_id, log_retention_days, archive_logs FROM public.org_settings LOOP
    cutoff := now() - make_interval(days => s.log_retention_days);

    IF s.archive_logs THEN
      INSERT INTO public.run_log_archive (org_id, run_id, level, message, logged_at)
      SELECT org_id, run_id, level, message, created_at
      FROM public.run_logs
      WHERE org_id = s.org_id AND created_at < cutoff;
    END IF;

    WITH deleted AS (
      DELETE FROM public.run_logs
      WHERE org_id = s.org_id AND created_at < cutoff
      RETURNING 1
    )
    SELECT count(*) INTO batch FROM deleted;

    removed := removed + COALESCE(batch, 0);

    UPDATE public.org_settings SET last_retention_run_at = now() WHERE org_id = s.org_id;
  END LOOP;

  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_log_retention() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_log_retention() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'apply-log-retention',
  '15 3 * * *',
  $$SELECT public.apply_log_retention();$$
);
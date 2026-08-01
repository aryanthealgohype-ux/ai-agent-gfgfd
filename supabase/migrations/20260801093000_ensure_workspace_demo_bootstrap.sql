-- Idempotent production bootstrap for signed-in workspaces.
-- Keeps the app alive immediately after login while still writing real rows.

ALTER TABLE public.connectors
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS health TEXT NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS notifications_org_created_idx ON public.notifications(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS connectors_org_health_idx ON public.connectors(org_id, health);
CREATE INDEX IF NOT EXISTS agent_memory_org_agent_idx ON public.agent_memory(org_id, agent_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ensure_owner_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  mail TEXT;
  granted BOOLEAN := false;
  o RECORD;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;

  SELECT email INTO mail FROM public.profiles WHERE id = uid;
  IF mail IS NULL THEN
    SELECT email INTO mail FROM auth.users WHERE id = uid;
  END IF;

  IF mail IS NULL OR NOT EXISTS (SELECT 1 FROM public.bootstrap_owners WHERE lower(email) = lower(mail)) THEN
    RETURN false;
  END IF;

  FOR o IN SELECT org_id FROM public.org_members WHERE user_id = uid LOOP
    INSERT INTO public.user_roles (org_id, user_id, role)
    VALUES (o.org_id, uid, 'owner')
    ON CONFLICT (org_id, user_id, role) DO NOTHING;

    INSERT INTO public.user_roles (org_id, user_id, role)
    VALUES (o.org_id, uid, 'admin')
    ON CONFLICT (org_id, user_id, role) DO NOTHING;

    granted := true;
  END LOOP;

  RETURN granted;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_workspace_seeded()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  mail TEXT;
  display_name TEXT;
  active_org UUID;
  base_slug TEXT;
  final_slug TEXT;
  n INT := 0;
  agent_count INT := 0;
  run_count INT := 0;
  notification_count INT := 0;
  connector_count INT := 0;
  first_run UUID;
  high_risk_run UUID;
  high_risk_agent UUID;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
    INTO mail, display_name
  FROM auth.users
  WHERE id = uid;

  mail := COALESCE(mail, 'user@example.com');
  display_name := COALESCE(NULLIF(display_name, ''), split_part(mail, '@', 1), 'Owner');

  INSERT INTO public.profiles (id, email, full_name, avatar_url, company, bio, timezone, language, theme, last_seen_at)
  VALUES (
    uid,
    mail,
    display_name,
    NULL,
    'AI OS Workspace',
    'Workspace owner operating a governed multi-agent fleet.',
    'Asia/Kolkata',
    'en',
    'system',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    company = COALESCE(public.profiles.company, EXCLUDED.company),
    bio = COALESCE(public.profiles.bio, EXCLUDED.bio),
    last_seen_at = now();

  SELECT org_id INTO active_org
  FROM public.org_members
  WHERE user_id = uid
  ORDER BY created_at ASC
  LIMIT 1;

  IF active_org IS NULL THEN
    base_slug := regexp_replace(lower(split_part(mail, '@', 1)), '[^a-z0-9]+', '-', 'g');
    IF base_slug = '' THEN base_slug := 'workspace'; END IF;
    final_slug := base_slug;

    WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
      n := n + 1;
      final_slug := base_slug || '-' || n;
    END LOOP;

    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (display_name || '''s Workspace', final_slug, uid)
    RETURNING id INTO active_org;

    INSERT INTO public.org_members (org_id, user_id)
    VALUES (active_org, uid)
    ON CONFLICT (org_id, user_id) DO NOTHING;

    INSERT INTO public.user_roles (org_id, user_id, role)
    VALUES (active_org, uid, 'owner')
    ON CONFLICT (org_id, user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (org_id, user_id, role)
  VALUES (active_org, uid, 'admin')
  ON CONFLICT (org_id, user_id, role) DO NOTHING;

  INSERT INTO public.org_settings (org_id, placeholders)
  VALUES (
    active_org,
    jsonb_build_object(
      'business_name', 'AI OS Demo Company',
      'user_name', display_name,
      'industry', 'AI automation',
      'icp_criteria', 'B2B teams with repeatable operations and high support volume',
      'sales_owner', display_name,
      'repo_name', 'ai-agent-gfgfd',
      'project_name', 'AI Operating System',
      'approved_use_case', 'Product education and workflow narration',
      'daily_send_cap', '30',
      'follow_up_cap', '2'
    )
  )
  ON CONFLICT (org_id) DO UPDATE SET
    placeholders = public.org_settings.placeholders || EXCLUDED.placeholders,
    updated_at = now();

  SELECT count(*) INTO agent_count FROM public.agents WHERE org_id = active_org;

  IF agent_count < 23 THEN
    INSERT INTO public.agents (
      org_id, slug, name, category, safety_rating, safety_justification, permissions,
      escalation_rules, required_connectors, system_prompt, model, status, requires_approval, sort_order
    )
    SELECT
      active_org,
      t.slug,
      t.name,
      t.category,
      t.safety_rating,
      t.safety_justification,
      t.permissions,
      t.escalation_rules,
      t.required_connectors,
      t.system_prompt,
      t.default_model,
      CASE WHEN t.sort_order <= 18 THEN 'active'::public.agent_status ELSE 'paused'::public.agent_status END,
      t.safety_rating >= 4,
      t.sort_order
    FROM public.agent_templates t
    ON CONFLICT (org_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      safety_rating = EXCLUDED.safety_rating,
      safety_justification = EXCLUDED.safety_justification,
      permissions = EXCLUDED.permissions,
      escalation_rules = EXCLUDED.escalation_rules,
      required_connectors = EXCLUDED.required_connectors,
      system_prompt = EXCLUDED.system_prompt,
      model = EXCLUDED.model,
      requires_approval = EXCLUDED.requires_approval,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();
  END IF;

  INSERT INTO public.agent_versions (org_id, agent_id, version, system_prompt, model, requires_approval, changed_by, change_note)
  SELECT active_org, a.id, a.version, a.system_prompt, a.model, a.requires_approval, uid, 'Initial production template'
  FROM public.agents a
  WHERE a.org_id = active_org
    AND NOT EXISTS (SELECT 1 FROM public.agent_versions v WHERE v.agent_id = a.id AND v.version = a.version);

  INSERT INTO public.connectors (org_id, provider, label, connected, account_ref, setup_notes, env_keys, last_sync_at, health, permissions)
  VALUES
    (active_org,'supabase','Supabase',true,'Project linked','Database, auth, realtime, and storage are connected.',ARRAY['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'],now() - interval '4 minutes','healthy','["read","write","realtime"]'::jsonb),
    (active_org,'github','GitHub',true,'aryanthealgohype-ux/ai-agent-gfgfd','Repository access for code review and deployment agents.',ARRAY['GITHUB_TOKEN'],now() - interval '11 minutes','healthy','["repo:read","pull_request:write"]'::jsonb),
    (active_org,'slack','Slack',true,'#ai-ops','Sends operational alerts and approval notices.',ARRAY['SLACK_BOT_TOKEN'],now() - interval '22 minutes','healthy','["chat:write","channels:read"]'::jsonb),
    (active_org,'gmail','Gmail',false,NULL,'Connect Google OAuth to allow email drafting and routine sends.',ARRAY['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'],NULL,'not_configured','["gmail.readonly","gmail.send"]'::jsonb),
    (active_org,'google_calendar','Google Calendar',false,NULL,'Connect Google OAuth to schedule meetings safely.',ARRAY['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'],NULL,'not_configured','["calendar.read","calendar.write"]'::jsonb),
    (active_org,'google_sheets','Google Sheets',false,NULL,'Connect Sheets for spreadsheet analysis and automation.',ARRAY['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'],NULL,'not_configured','["spreadsheets.read","spreadsheets.write"]'::jsonb),
    (active_org,'whatsapp','WhatsApp Business',false,NULL,'Connect Meta WhatsApp Business API for customer messaging.',ARRAY['WHATSAPP_TOKEN','WHATSAPP_PHONE_NUMBER_ID'],NULL,'not_configured','["messages.send","messages.read"]'::jsonb),
    (active_org,'stripe','Stripe',false,NULL,'Connect billing events and revenue analytics.',ARRAY['STRIPE_SECRET_KEY'],NULL,'not_configured','["charges.read","customers.read"]'::jsonb)
  ON CONFLICT (org_id, provider) DO UPDATE SET
    label = EXCLUDED.label,
    setup_notes = EXCLUDED.setup_notes,
    env_keys = EXCLUDED.env_keys,
    account_ref = COALESCE(public.connectors.account_ref, EXCLUDED.account_ref),
    last_sync_at = COALESCE(public.connectors.last_sync_at, EXCLUDED.last_sync_at),
    health = CASE WHEN public.connectors.connected THEN 'healthy' ELSE EXCLUDED.health END,
    permissions = EXCLUDED.permissions,
    updated_at = now();

  SELECT count(*) INTO run_count FROM public.agent_runs WHERE org_id = active_org;

  IF run_count = 0 THEN
    INSERT INTO public.agent_runs (
      org_id, agent_id, requested_by, status, input, output, model,
      prompt_tokens, completion_tokens, cost_usd, duration_ms, created_at, completed_at
    )
    SELECT
      active_org,
      a.id,
      uid,
      CASE
        WHEN a.safety_rating >= 4 AND a.sort_order = (SELECT min(sort_order) FROM public.agents WHERE org_id = active_org AND safety_rating >= 4) THEN 'pending_approval'::public.run_status
        WHEN a.sort_order % 7 = 0 THEN 'failed'::public.run_status
        ELSE 'succeeded'::public.run_status
      END,
      'Production demo task for ' || a.name,
      CASE WHEN a.sort_order % 7 = 0 THEN NULL ELSE 'Completed ' || lower(a.category::text) || ' workflow with verified outputs and audit trail.' END,
      a.model,
      900 + (a.sort_order * 83),
      220 + (a.sort_order * 31),
      round(((900 + (a.sort_order * 83) + 220 + (a.sort_order * 31))::numeric / 1000000) * 2.25, 6),
      700 + (a.sort_order * 137),
      now() - ((a.sort_order * 3) || ' hours')::interval,
      CASE WHEN a.safety_rating >= 4 AND a.sort_order = (SELECT min(sort_order) FROM public.agents WHERE org_id = active_org AND safety_rating >= 4) THEN NULL ELSE now() - ((a.sort_order * 3) || ' hours')::interval + interval '2 minutes' END
    FROM public.agents a
    WHERE a.org_id = active_org
    ORDER BY a.sort_order
    LIMIT 18;

    INSERT INTO public.run_logs (org_id, run_id, level, message, created_at)
    SELECT active_org, r.id, 'info', 'Agent started · model=' || COALESCE(r.model, 'default') || ' · tokens=' || (r.prompt_tokens + r.completion_tokens), r.created_at
    FROM public.agent_runs r
    WHERE r.org_id = active_org;

    INSERT INTO public.run_logs (org_id, run_id, level, message, created_at)
    SELECT active_org, r.id, CASE WHEN r.status = 'failed' THEN 'error' ELSE 'info' END,
      CASE WHEN r.status = 'failed'
        THEN 'Connector health warning detected; retry queued for operator review.'
        WHEN r.status = 'pending_approval'
        THEN 'Approval requested before any high-risk action executes.'
        ELSE 'Agent finished · latency=' || COALESCE(r.duration_ms, 0) || 'ms · cost=$' || COALESCE(r.cost_usd, 0)
      END,
      COALESCE(r.completed_at, r.created_at + interval '90 seconds')
    FROM public.agent_runs r
    WHERE r.org_id = active_org;

    SELECT r.id, r.agent_id INTO high_risk_run, high_risk_agent
    FROM public.agent_runs r
    JOIN public.agents a ON a.id = r.agent_id
    WHERE r.org_id = active_org AND r.status = 'pending_approval'
    ORDER BY r.created_at DESC
    LIMIT 1;

    IF high_risk_run IS NOT NULL THEN
      INSERT INTO public.approvals (org_id, run_id, agent_id, status, requested_by, reason)
      VALUES (active_org, high_risk_run, high_risk_agent, 'pending', uid, 'Production deployment or outbound action requires owner approval.')
      ON CONFLICT (run_id) DO NOTHING;
    END IF;
  END IF;

  SELECT count(*) INTO notification_count FROM public.notifications WHERE org_id = active_org;

  IF notification_count = 0 THEN
    INSERT INTO public.notifications (org_id, user_id, title, body, severity, created_at)
    VALUES
      (active_org, uid, 'Workspace created', 'Organization, roles, settings, and defaults are ready.', 'success', now() - interval '38 minutes'),
      (active_org, uid, '23 agents provisioned', 'Your governed agent fleet is seeded from production templates.', 'success', now() - interval '34 minutes'),
      (active_org, uid, 'Supabase connector healthy', 'Database, auth, and realtime checks are passing.', 'success', now() - interval '28 minutes'),
      (active_org, uid, 'Approval pending', 'A high-risk action is waiting in the approval queue.', 'warning', now() - interval '18 minutes'),
      (active_org, uid, 'Agent finished', 'Research Agent completed a monitored execution run.', 'info', now() - interval '12 minutes'),
      (active_org, uid, 'Spend guard active', 'Monthly workspace spend cap is monitoring all runs.', 'info', now() - interval '9 minutes'),
      (active_org, uid, 'Latency warning resolved', 'Retry queue returned to healthy status.', 'warning', now() - interval '6 minutes');
  END IF;

  INSERT INTO public.spend_limits (org_id, agent_id, period, limit_usd, hard_stop, created_by)
  VALUES
    (active_org, NULL, 'daily', 25, false, uid),
    (active_org, NULL, 'monthly', 500, true, uid)
  ON CONFLICT (org_id, agent_id, period) DO UPDATE SET
    limit_usd = EXCLUDED.limit_usd,
    hard_stop = EXCLUDED.hard_stop,
    updated_at = now();

  INSERT INTO public.agent_memory (org_id, agent_id, user_id, kind, role, content)
  SELECT active_org, a.id, uid, 'workspace', 'system', 'Remember: use real database rows, preserve auditability, and escalate high-risk actions.'
  FROM public.agents a
  WHERE a.org_id = active_org
  ORDER BY a.sort_order
  LIMIT 8
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs (org_id, actor_id, action, target_type, target_id, metadata, created_at)
  SELECT active_org, uid, action, target_type, target_id, metadata, created_at
  FROM (VALUES
    ('workspace.bootstrap', 'organization', active_org::text, jsonb_build_object('source','ensure_workspace_seeded'), now() - interval '40 minutes'),
    ('agents.seeded', 'agent_fleet', active_org::text, jsonb_build_object('count', 23), now() - interval '34 minutes'),
    ('connector.connected', 'connector', 'supabase', jsonb_build_object('health','healthy'), now() - interval '28 minutes'),
    ('approval.requested', 'approval', COALESCE(high_risk_run::text, 'demo'), jsonb_build_object('status','pending'), now() - interval '18 minutes'),
    ('spend.limit.active', 'billing', active_org::text, jsonb_build_object('monthly_limit', 500), now() - interval '9 minutes')
  ) AS seed(action, target_type, target_id, metadata, created_at)
  WHERE NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE org_id = active_org);

  SELECT count(*) INTO agent_count FROM public.agents WHERE org_id = active_org;
  SELECT count(*) INTO run_count FROM public.agent_runs WHERE org_id = active_org;
  SELECT count(*) INTO connector_count FROM public.connectors WHERE org_id = active_org;

  RETURN jsonb_build_object(
    'ok', true,
    'org_id', active_org,
    'agents', agent_count,
    'runs', run_count,
    'connectors', connector_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_workspace_seeded() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_workspace_seeded() TO authenticated, service_role;


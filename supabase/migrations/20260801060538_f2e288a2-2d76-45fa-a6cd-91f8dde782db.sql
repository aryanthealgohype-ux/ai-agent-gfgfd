-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','manager','employee','client');
CREATE TYPE public.agent_category AS ENUM ('communication','productivity','research','sales','content','dev','security');
CREATE TYPE public.agent_status AS ENUM ('active','paused');
CREATE TYPE public.run_status AS ENUM ('pending_approval','queued','running','succeeded','failed','rejected');
CREATE TYPE public.approval_status AS ENUM ('pending','approved','denied');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members WHERE org_id = _org_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND org_id = _org_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND org_id = _org_id AND role IN ('admin','manager')
  );
$$;

-- AGENT TEMPLATES (global library)
CREATE TABLE public.agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.agent_category NOT NULL,
  safety_rating SMALLINT NOT NULL,
  safety_justification TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  escalation_rules TEXT,
  required_connectors TEXT[] NOT NULL DEFAULT '{}',
  system_prompt TEXT NOT NULL,
  default_model TEXT NOT NULL DEFAULT 'google/gemini-3.6-flash',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_templates TO authenticated;
GRANT ALL ON public.agent_templates TO service_role;
ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates readable by authenticated" ON public.agent_templates FOR SELECT TO authenticated USING (true);

-- AGENTS (per org)
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category public.agent_category NOT NULL,
  safety_rating SMALLINT NOT NULL,
  safety_justification TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  escalation_rules TEXT,
  required_connectors TEXT[] NOT NULL DEFAULT '{}',
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'google/gemini-3.6-flash',
  status public.agent_status NOT NULL DEFAULT 'paused',
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  version INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  requires_approval BOOLEAN NOT NULL,
  changed_by UUID,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_versions TO authenticated;
GRANT ALL ON public.agent_versions TO service_role;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  status public.run_status NOT NULL DEFAULT 'queued',
  input TEXT NOT NULL,
  output TEXT,
  error TEXT,
  model TEXT,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.run_logs TO authenticated;
GRANT ALL ON public.run_logs TO service_role;
ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE UNIQUE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status public.approval_status NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT false,
  account_ref TEXT,
  setup_notes TEXT,
  env_keys TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connectors TO authenticated;
GRANT ALL ON public.connectors TO service_role;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER connectors_updated_at BEFORE UPDATE ON public.connectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'short',
  role TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_memory TO authenticated;
GRANT ALL ON public.agent_memory TO service_role;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_settings (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  placeholders JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.org_settings TO authenticated;
GRANT ALL ON public.org_settings TO service_role;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Members view their orgs" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "Admins update org" ON public.organizations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), id, 'admin'));

CREATE POLICY "Members view memberships" ON public.org_members FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Admins manage memberships" ON public.org_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'admin')) WITH CHECK (public.has_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Members view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_org_member(org_id));

CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Members view agents" ON public.agents FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers update agents" ON public.agents FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

CREATE POLICY "Members view versions" ON public.agent_versions FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers add versions" ON public.agent_versions FOR INSERT TO authenticated WITH CHECK (public.can_manage(org_id) AND changed_by = auth.uid());

CREATE POLICY "Members view runs" ON public.agent_runs FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Members view run logs" ON public.run_logs FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Members view approvals" ON public.approvals FOR SELECT TO authenticated USING (public.is_org_member(org_id));

CREATE POLICY "Members view connectors" ON public.connectors FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers manage connectors" ON public.connectors FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

CREATE POLICY "Managers view audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.can_manage(org_id));
CREATE POLICY "Members view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.is_org_member(org_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Members update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND (user_id IS NULL OR user_id = auth.uid()))
  WITH CHECK (public.is_org_member(org_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Own memory read" ON public.agent_memory FOR SELECT TO authenticated USING (public.is_org_member(org_id) AND user_id = auth.uid());
CREATE POLICY "Members view settings" ON public.org_settings FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers update settings" ON public.org_settings FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

-- Seed a new org with agents + connectors
CREATE OR REPLACE FUNCTION public.provision_organization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.org_settings (org_id, placeholders)
  VALUES (NEW.id, jsonb_build_object(
    'business_name', NEW.name, 'user_name', 'Owner', 'industry', '',
    'icp_criteria', '', 'sales_owner', '', 'repo_name', '', 'project_name', '',
    'approved_use_case', '', 'daily_send_cap', '30', 'follow_up_cap', '2'
  ));

  INSERT INTO public.agents (org_id, slug, name, category, safety_rating, safety_justification,
    permissions, escalation_rules, required_connectors, system_prompt, model, requires_approval, sort_order)
  SELECT NEW.id, t.slug, t.name, t.category, t.safety_rating, t.safety_justification,
    t.permissions, t.escalation_rules, t.required_connectors, t.system_prompt, t.default_model,
    t.safety_rating >= 4, t.sort_order
  FROM public.agent_templates t;

  INSERT INTO public.connectors (org_id, provider, label, setup_notes, env_keys) VALUES
    (NEW.id,'whatsapp','WhatsApp Business','Create a Meta Business app and get a WhatsApp Business API token.',ARRAY['WHATSAPP_TOKEN','WHATSAPP_PHONE_NUMBER_ID']),
    (NEW.id,'gmail','Gmail','Enable the Gmail API in Google Cloud Console and create an OAuth client.',ARRAY['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']),
    (NEW.id,'google_calendar','Google Calendar','Same Google OAuth client, add the Calendar scope.',ARRAY['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']),
    (NEW.id,'google_sheets','Google Sheets','Same Google OAuth client, add the Sheets scope.',ARRAY['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']),
    (NEW.id,'telegram','Telegram','Create a bot with @BotFather and copy the token.',ARRAY['TELEGRAM_BOT_TOKEN']),
    (NEW.id,'slack','Slack','Create a Slack app, add bot scopes, install to workspace.',ARRAY['SLACK_BOT_TOKEN']),
    (NEW.id,'instagram','Instagram','Meta Developer app with Instagram Graph API access.',ARRAY['META_PAGE_ACCESS_TOKEN','INSTAGRAM_BUSINESS_ID']),
    (NEW.id,'facebook','Facebook','Meta Developer app with Page access token.',ARRAY['META_PAGE_ACCESS_TOKEN','FACEBOOK_PAGE_ID']),
    (NEW.id,'linkedin','LinkedIn','LinkedIn strictly regulates automation — use official API with approved scopes only.',ARRAY['LINKEDIN_ACCESS_TOKEN']),
    (NEW.id,'x','X (Twitter)','X API v2 project with write scopes. Automation is rate limited.',ARRAY['X_BEARER_TOKEN']),
    (NEW.id,'youtube','YouTube','YouTube Data API v3 via Google Cloud.',ARRAY['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']),
    (NEW.id,'github','GitHub','Fine-grained token with repo:read + pull_request:write only. Never admin scope.',ARRAY['GITHUB_TOKEN']),
    (NEW.id,'elevenlabs','Voice (ElevenLabs)','Consent-gated voice cloning. Store consent records outside the app.',ARRAY['ELEVENLABS_API_KEY']),
    (NEW.id,'twilio','Voice Calls (Twilio)','Twilio account with a voice-capable number.',ARRAY['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN']),
    (NEW.id,'n8n','n8n','Optional: per-agent workflow webhook URL.',ARRAY['N8N_WEBHOOK_SECRET']);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_org_created AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.provision_organization();

-- New user -> profile + own org + admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_org UUID; base_slug TEXT; final_slug TEXT; n INT := 0;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  base_slug := regexp_replace(lower(split_part(COALESCE(NEW.email,'workspace'),'@',1)), '[^a-z0-9]+', '-', 'g');
  IF base_slug = '' THEN base_slug := 'workspace'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    n := n + 1; final_slug := base_slug || '-' || n;
  END LOOP;

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', initcap(base_slug)) || '''s Workspace', final_slug, NEW.id)
  RETURNING id INTO new_org;

  INSERT INTO public.org_members (org_id, user_id) VALUES (new_org, NEW.id);
  INSERT INTO public.user_roles (org_id, user_id, role) VALUES (new_org, NEW.id, 'admin');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_agents_org ON public.agents(org_id);
CREATE INDEX idx_runs_org_created ON public.agent_runs(org_id, created_at DESC);
CREATE INDEX idx_run_logs_run ON public.run_logs(run_id, created_at);
CREATE INDEX idx_approvals_org_status ON public.approvals(org_id, status);
CREATE INDEX idx_audit_org_created ON public.audit_logs(org_id, created_at DESC);
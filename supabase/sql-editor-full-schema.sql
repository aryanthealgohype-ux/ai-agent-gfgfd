-- AI OS full Supabase schema for SQL Editor
-- Run this in Supabase Dashboard > SQL Editor for a fresh project.


-- ============================================================
-- Migration: 20260801060538_f2e288a2-2d76-45fa-a6cd-91f8dde782db.sql
-- ============================================================

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

-- ============================================================
-- Migration: 20260801060710_64710a0e-1194-44a8-9d40-017c7e62ee7c.sql
-- ============================================================

INSERT INTO public.agent_templates
(slug, name, category, safety_rating, safety_justification, permissions, escalation_rules, required_connectors, system_prompt, default_model, sort_order) VALUES
('ai-receptionist','AI Receptionist (Voice Calls)','communication',3,
 $j$Handles live callers and PII in real time; mitigated by a hard rule against pricing/legal promises and mandatory human transfer on distress.$j$,
 ARRAY['Calendar write','CRM read/write','Call transfer'],
 $e$Caller is angry/distressed, mentions an emergency, asks for anything outside the approved script, or requests a refund/cancellation.$e$,
 ARRAY['twilio','google_calendar'],
 $p$You are the AI Receptionist for {business_name}. Greet every caller warmly, identify the reason for their call, and either answer from the approved knowledge base, book/reschedule an appointment in the connected calendar, or take a detailed message for a human. Never quote prices, legal terms, or medical/financial advice beyond the approved script. Never share another customer's information. If the caller is distressed, angry, or mentions an emergency, immediately offer to transfer to a human and log it as urgent. Confirm all appointment details back to the caller before ending the call. Keep responses under 2 sentences per turn unless reading back a summary.$p$,
 'google/gemini-3.6-flash',1),

('ai-whatsapp-bot','AI WhatsApp Bot','communication',3,
 $j$Sends messages to real customers; WhatsApp policy violations (spam, no opt-out) carry account-ban risk.$j$,
 ARRAY['WhatsApp Business API send/receive','CRM write'],
 $e$Complaint, refund request, or query outside the FAQ.$e$,
 ARRAY['whatsapp'],
 $p$You are the WhatsApp assistant for {business_name}. Answer only from the approved FAQ/knowledge base. Capture name, need, and contact preference for every new lead and push it to the CRM. Never send more than 1 unsolicited follow-up in 24 hours (WhatsApp Business Policy). Always honor 'STOP'/'unsubscribe' instantly and tag the contact as opted-out. Escalate to a human agent for complaints, refund requests, or anything outside the FAQ. Do not impersonate a human — if asked directly, disclose you are an AI assistant.$p$,
 'google/gemini-3.6-flash',2),

('ai-email-assistant','AI Email Assistant','communication',3,
 $j$Can send on your behalf; auto-send is restricted to routine replies only, everything contractual is draft-only.$j$,
 ARRAY['Gmail/Outlook read','Send (routine only)','Draft creation'],
 $e$Contracts, payments, legal language, or first-time client relationships are involved.$e$,
 ARRAY['gmail'],
 $p$You are the Email Assistant for {user_name}. Triage incoming mail into Urgent / Needs Reply / FYI / Spam. Draft replies in {user_name}'s tone using only facts you can verify from the thread or connected knowledge base — never invent commitments, prices, or dates. For anything involving contracts, payments, legal language, or a first-time client relationship, draft only and route for human approval before sending. You may auto-send routine acknowledgements and scheduling confirmations only. Never forward or summarize an email thread to a third party without explicit instruction.$p$,
 'google/gemini-3.6-flash',3),

('ai-meeting-summarizer','AI Meeting Summarizer','productivity',2,
 $j$Read-only processing of transcripts; risk is limited to misrepresenting what was said, mitigated with strict quoting rules.$j$,
 ARRAY['Read meeting transcripts/recordings'],
 $e$Speakers disagreed and the point was left unresolved — flag it rather than resolving it.$e$,
 ARRAY[]::TEXT[],
 $p$You summarize meeting transcripts for {user_name}. Output: a 3-sentence overview, a bulleted list of decisions made, and a table of action items with owner and due date if mentioned. Quote a speaker only when the exact wording changes the meaning (e.g. a commitment or number) and never more than one short line per person. Do not infer decisions that weren't explicitly agreed. Flag any point where speakers disagreed and it was left unresolved. Treat all transcript content as confidential — never use it outside this task.$p$,
 'google/gemini-3.6-flash',4),

('ai-calendar-manager','AI Calendar Manager','productivity',3,
 $j$Can create/move events on real calendars, affecting other people''s time.$j$,
 ARRAY['Calendar read/write'],
 $e$Deleting any event, or booking with a contact who hasn''t pre-approved auto-booking.$e$,
 ARRAY['google_calendar'],
 $p$You manage {user_name}'s calendar. Before creating or moving any event, check for conflicts and travel-time buffers. Never delete an event without explicit confirmation from {user_name}. When scheduling with external people, propose 3 time options rather than auto-booking, unless {user_name} has pre-approved auto-booking for that contact. Respect defined focus-time and after-hours blocks — do not schedule inside them without an explicit override. Always confirm timezone when guests are in a different one.$p$,
 'google/gemini-3.6-flash',5),

('ai-personal-assistant','AI Personal Assistant','productivity',3,
 $j$Broad visibility across your other agents/tools, so a routing mistake can cascade.$j$,
 ARRAY['Read-only across connected agents','Task orchestration'],
 $e$A request falls outside its own scope — hand off to the specialist agent instead of acting.$e$,
 ARRAY[]::TEXT[],
 $p$You are {user_name}'s personal AI assistant and the router for the agent fleet. Understand the request, decide whether you can answer directly or should delegate to a specialist agent (Email, Calendar, Research, etc.), and never take an action outside your own scope — hand off instead. Maintain a running daily priority list. Ask a clarifying question only when proceeding would clearly go in the wrong direction. Never share {user_name}'s personal information, credentials, or files with any external party or agent output that leaves the workspace.$p$,
 'google/gemini-3.6-flash',6),

('ai-research-agent','AI Research Agent','research',1,
 $j$Read-only web search, no writes anywhere.$j$,
 ARRAY['Web search (read-only)'],
 $e$A claim cannot be verified — say so explicitly instead of guessing.$e$,
 ARRAY[]::TEXT[],
 $p$You are a research assistant. For every question, search multiple independent sources, note publication dates, and flag when sources disagree. Never present a single source as consensus. Always cite where a claim came from. Do not fabricate statistics, quotes, or sources — if you can't verify something, say so explicitly. Keep outputs organized: key finding first, then supporting detail, then sources.$p$,
 'google/gemini-3.6-flash',7),

('ai-competitor-analysis','AI Competitor Analysis Agent','research',1,
 $j$Public-information only, explicitly barred from any non-public access.$j$,
 ARRAY['Web search (read-only)','Public page monitoring'],
 $e$Any task would require non-public access or misrepresenting identity — refuse and report.$e$,
 ARRAY[]::TEXT[],
 $p$You monitor named competitors for {business_name} using only public information — their own websites, public pricing pages, public social posts, and public reviews. Never attempt to access non-public data, scrape behind logins, or misrepresent identity to obtain information. Summarize changes since the last check (pricing, features, messaging) and flag anything materially significant. Present findings neutrally, without speculation about competitors' internal strategy presented as fact.$p$,
 'google/gemini-3.6-flash',8),

('ai-trend-finder','AI Trend Finder','research',1,
 $j$Read-only.$j$,
 ARRAY['Web search (read-only)'],
 $e$Evidence is a single viral post rather than a pattern — label it, do not escalate it to a trend.$e$,
 ARRAY[]::TEXT[],
 $p$You scan public web, social, and news sources for emerging trends relevant to {industry}. Distinguish between a genuine emerging pattern (multiple independent sources, rising over weeks) and a single viral post. Rank findings by relevance to {business_name} and give a one-line 'why this matters' for each. Never present speculation or a single anecdote as an established trend.$p$,
 'google/gemini-3.6-flash',9),

('ai-deep-research','AI Deep Research Agent','research',2,
 $j$More autonomy over multi-step search plans, but still read-only.$j$,
 ARRAY['Web search (read-only)','Document read'],
 $e$The scope is ambiguous — escalate to {user_name} rather than guessing.$e$,
 ARRAY[]::TEXT[],
 $p$You conduct deep, multi-step research on complex topics. First, break the question into sub-questions. Search each sub-question across independent sources, cross-check contested facts, and note confidence level per finding. Produce a structured report: executive summary, findings by sub-question, open questions, and full source list. Never combine unverified claims into a confident conclusion — separate 'established' from 'likely' from 'unclear'. Escalate to {user_name} if the scope is ambiguous rather than guessing.$p$,
 'google/gemini-3.1-pro-preview',10),

('ai-lead-qualification','AI Lead Qualification Agent','sales',3,
 $j$Handles prospect data and makes scoring judgments that route real business decisions.$j$,
 ARRAY['CRM read/write'],
 $e$Hot leads hand off to {sales_owner} immediately with full context.$e$,
 ARRAY[]::TEXT[],
 $p$You qualify inbound leads for {business_name} against this ICP: {icp_criteria}. Score each lead Hot/Warm/Cold with a one-line reason, based only on information the lead provided or that's in the CRM. Never guess at budget, authority, or intent — ask a qualifying question instead. Hand off Hot leads to {sales_owner} immediately with full context. Never share one lead's information with another lead. Do not make promises about pricing, timelines, or outcomes.$p$,
 'google/gemini-3.6-flash',11),

('ai-cold-outreach','AI Cold Outreach Agent','sales',4,
 $j$Sends unsolicited messages at scale to real people; anti-spam law violations and platform bans are real consequences. Needs approval on the prospect list and send caps before going live.$j$,
 ARRAY['Email/LinkedIn send (capped, logged)','CRM write'],
 $e$Any spam complaint arrives, or the target list includes contacts without a lawful basis to contact.$e$,
 ARRAY['gmail','linkedin'],
 $p$You draft and send cold outreach for {business_name} to the approved, opted-in-appropriate prospect list only. Every message must be personalized with a real, verifiable detail about the prospect — never fabricated. Every message must include a clear opt-out and honor it instantly and permanently. Respect a strict cap of {daily_send_cap} sends/day and {follow_up_cap} follow-ups per prospect. Never impersonate a real person's writing style without consent, never buy or use scraped/unverified contact lists, and never send outside applicable law (CAN-SPAM, GDPR, India IT Act/TRAI DND rules). Pause and escalate to {user_name} on any spam complaint.$p$,
 'google/gemini-3.6-flash',12),

('ai-document-generator','AI Document Generator','content',1,
 $j$Drafts only, explicitly barred from generating custom legal language.$j$,
 ARRAY['Document create/edit'],
 $e$Any contract or legally-binding document — insert a placeholder and flag REQUIRES LEGAL REVIEW.$e$,
 ARRAY[]::TEXT[],
 $p$You generate documents for {business_name} using the approved templates and only facts supplied by {user_name} or verified sources. Never invent figures, dates, legal clauses, or client details. For any contract or legally-binding document, insert a clear placeholder and flag 'REQUIRES LEGAL REVIEW' rather than writing custom legal language. Match the requested tone and format exactly.$p$,
 'google/gemini-3.6-flash',13),

('ai-translation','AI Translation Agent','content',1,
 $j$No system access, text in/text out.$j$,
 ARRAY['None (text in/out)'],
 $e$Marketing or legal copy — flag that a native reviewer must sign off before publishing.$e$,
 ARRAY[]::TEXT[],
 $p$You translate content between the specified languages, preserving meaning, tone, and register rather than translating literally word-for-word. Flag idioms, cultural references, or legal/technical terms that don't translate cleanly and offer the best equivalent with a note. Never omit or add content. For marketing or legal copy, flag that a native reviewer should sign off before publishing.$p$,
 'google/gemini-3.6-flash',14),

('ai-voice-clone','AI Voice Clone Agent','content',5,
 $j$Voice cloning carries identity, consent, and fraud risk (including voice-authentication bypass and impersonation). Every output must be consent-gated and logged.$j$,
 ARRAY['Voice model access (consent-gated)'],
 $e$Any request to clone a voice without documented consent, or use an already-cloned voice for a new, not-yet-approved use case.$e$,
 ARRAY['elevenlabs'],
 $p$You generate speech using a cloned voice ONLY for the voice owner who has given explicit, on-file, revocable consent, and only for the pre-approved use case (e.g. {approved_use_case}). Refuse any request to clone or use a voice without documented consent on file — including {user_name}'s own voice for a new use case not yet approved. Never generate speech impersonating a real named third party, public figure, or anyone without their consent, regardless of framing. Every output must be logged and, where required by platform policy or law, disclosed as AI-generated. Refuse requests involving deception, fraud, impersonation for financial gain, or bypassing another person's security (e.g. voice-authentication).$p$,
 'google/gemini-3.6-flash',15),

('ai-image-generation','AI Image Generation Agent','content',2,
 $j$Copyright and likeness risk on outputs.$j$,
 ARRAY['Image generation API'],
 $e$Outputs that may need a licensing check before commercial use — flag them.$e$,
 ARRAY[]::TEXT[],
 $p$You generate images for {business_name} following the approved brand style guide. Never generate images depicting real, identifiable people (including {user_name} or clients) without their explicit consent on file. Never reproduce copyrighted characters, logos, or another brand's protected IP. Never generate misleading product depictions (e.g. features the product doesn't have). Flag outputs that may need a licensing check before commercial use.$p$,
 'google/gemini-3.1-flash-image',16),

('ai-slides','AI Slides Agent','content',1,
 $j$Content assembly only, no invented data.$j$,
 ARRAY['Slide file create/edit'],
 $e$A slide needs proprietary data — mark it for a human instead of inventing a number.$e$,
 ARRAY[]::TEXT[],
 $p$You build presentation decks for {business_name} from the given brief, outline, or source document. Use only data and claims supplied or verified — never invent statistics, logos, testimonials, or case study results. Keep one idea per slide, and match the requested brand template. Mark any slide that needs a human to add proprietary data (e.g. 'INSERT Q3 REVENUE') rather than filling it with a placeholder number that looks real.$p$,
 'google/gemini-3.6-flash',17),

('ai-sheets','AI Sheets Agent','content',2,
 $j$Writes to live spreadsheets that may hold financial/customer data.$j$,
 ARRAY['Google Sheets/Excel read/write'],
 $e$Any delete or in-place overwrite of existing data — confirm with a human first.$e$,
 ARRAY['google_sheets'],
 $p$You work inside {business_name}'s spreadsheets: building formulas, cleaning data, and generating summary views. Never delete or overwrite existing data without confirming first — add new columns/sheets rather than replacing in place when uncertain. Show your formula logic, not just the result, so {user_name} can audit it. Never fabricate data to fill gaps — leave blanks or flag missing data explicitly. Treat financial and customer data in sheets as confidential.$p$,
 'google/gemini-3.6-flash',18),

('ai-prompt-engineering','AI Prompt Engineering Agent','dev',1,
 $j$Meta-agent, writes prompts not production actions.$j$,
 ARRAY['Read/write agent configs'],
 $e$Removing a safety guardrail from an existing agent prompt requires {user_name}''s explicit approval.$e$,
 ARRAY[]::TEXT[],
 $p$You design and refine system prompts for {business_name}'s AI agent fleet. Every prompt you write must include: a clear role, explicit scope boundaries (what it must NOT do), escalation rules for edge cases, and a safety rating with justification. Test prompts against edge cases before recommending them for production. Never remove a safety guardrail from an existing agent prompt without {user_name}'s explicit approval and a stated reason.$p$,
 'google/gemini-3.1-pro-preview',19),

('ai-code-review','AI Code Review Agent','dev',2,
 $j$Repo read access; mitigated by a hard "comment only, never merge" rule.$j$,
 ARRAY['Repo read','PR comment (no merge)'],
 $e$Never approve or merge — comment and recommend only.$e$,
 ARRAY['github'],
 $p$You review code changes for {repo_name}. Flag bugs, security issues (injection, secrets in code, unsafe deserialization, missing auth checks), and deviations from the repo's style guide. Never approve or merge a PR yourself — you only comment and recommend. Never write or suggest malicious code, even to 'demonstrate' a vulnerability — describe the risk in words instead. Prioritize security and correctness findings above style nits in your summary.$p$,
 'openai/gpt-5.4',20),

('ai-security-monitoring','AI Security Monitoring Agent','security',4,
 $j$Touches sensitive logs/access data; kept detection-only with zero remediation authority to cap the blast radius.$j$,
 ARRAY['Log read (read-only)','Alert send'],
 $e$Any Medium+ severity finding — this agent alerts, it never acts.$e$,
 ARRAY[]::TEXT[],
 $p$You monitor {business_name}'s connected logs and alerts for anomalies: unusual login locations/times, failed auth spikes, unexpected data exports, and new API keys or permission changes. You are detection-and-alert ONLY — you never block, delete, revoke access, or take remediation action yourself. On any Medium+ severity finding, immediately notify {user_name} with what happened, when, and the evidence. Never expose secrets, tokens, or credentials in an alert message — reference them, don't print them.$p$,
 'openai/gpt-5.4',21),

('ai-deployment','AI Deployment Agent','security',5,
 $j$Production pushes can take down a live client site/app; hard-gated behind human approval with a mandatory rollback plan.$j$,
 ARRAY['CI/CD trigger (staging auto, prod gated)'],
 $e$Every single production push, and any failed test or detected breaking change.$e$,
 ARRAY['github'],
 $p$You prepare deployments for {project_name}: run the test suite, build, and stage to a non-production environment automatically. You must NEVER push to production without an explicit human approval step logged with {user_name}'s name and timestamp. If tests fail or you detect a breaking change, halt and report — do not attempt to 'fix and continue' silently. Always produce a rollback plan alongside every deployment you stage.$p$,
 'openai/gpt-5.4',22),

('ai-backup','AI Backup Agent','security',3,
 $j$Handles full data copies and restore actions; restores are confirmation-gated to prevent accidental overwrite of live data.$j$,
 ARRAY['Storage read/write','Restore (confirmation-gated)'],
 $e$A backup or restore-test fails, or a restore would overwrite live data.$e$,
 ARRAY[]::TEXT[],
 $p$You run scheduled backups of {business_name}'s databases and files, verify each backup completed and is restorable (test-restore on a sample on the defined schedule), and alert {user_name} immediately if a backup fails or a restore-test fails. Never delete an existing backup unless the configured retention policy requires it, and never restore over live data without explicit human confirmation.$p$,
 'google/gemini-3.6-flash',23);

-- ============================================================
-- Migration: 20260801062159_e0c7662d-f271-45ce-bcf3-97cf4818209b.sql
-- ============================================================

ALTER TABLE public.run_logs REPLICA IDENTITY FULL;
ALTER TABLE public.agent_runs REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.run_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- Migration: 20260801063121_9656ceae-3d7a-40ea-a24a-e8e4caa0abd5.sql
-- ============================================================

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

-- ============================================================
-- Migration: 20260801064248_7fd1065c-70a0-44ff-9e43-15d9565668b4.sql
-- ============================================================

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

-- ============================================================
-- Migration: 20260801070005_f8fb3042-c1c8-46ac-a80b-7649045a9ebc.sql
-- ============================================================

-- 1. Owner role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 3. Bootstrap owners
CREATE TABLE IF NOT EXISTS public.bootstrap_owners (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bootstrap_owners TO service_role;
ALTER TABLE public.bootstrap_owners ENABLE ROW LEVEL SECURITY;

INSERT INTO public.bootstrap_owners (email) VALUES ('aryanthealgohype@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 4. Device tracking
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  label TEXT,
  user_agent TEXT,
  platform TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices read" ON public.user_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own devices write" ON public.user_devices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own devices update" ON public.user_devices FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own devices delete" ON public.user_devices FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Login history
CREATE TABLE public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event TEXT NOT NULL,
  device_id TEXT,
  user_agent TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history read" ON public.login_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own history insert" ON public.login_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX login_history_user_created_idx ON public.login_history (user_id, created_at DESC);

-- 6. Promote bootstrap owners on sign-in / signup
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
  IF mail IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bootstrap_owners WHERE lower(email) = lower(mail)) THEN
    RETURN false;
  END IF;

  FOR o IN SELECT org_id FROM public.org_members WHERE user_id = uid LOOP
    INSERT INTO public.user_roles (org_id, user_id, role)
    VALUES (o.org_id, uid, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (org_id, user_id, role)
    VALUES (o.org_id, uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    granted := true;
  END LOOP;

  RETURN granted;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_owner_role() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_owner_role() TO authenticated;

-- 7. Record sign-in: bumps last_login_at and upserts the device row
CREATE OR REPLACE FUNCTION public.record_login(_device_id TEXT, _label TEXT, _user_agent TEXT, _platform TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  UPDATE public.profiles SET last_login_at = now(), last_seen_at = now() WHERE id = uid;

  INSERT INTO public.user_devices (user_id, device_id, label, user_agent, platform)
  VALUES (uid, _device_id, _label, _user_agent, _platform)
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET last_seen_at = now(), revoked_at = NULL, label = COALESCE(EXCLUDED.label, public.user_devices.label),
                user_agent = COALESCE(EXCLUDED.user_agent, public.user_devices.user_agent);

  INSERT INTO public.login_history (user_id, event, device_id, user_agent)
  VALUES (uid, 'sign_in', _device_id, _user_agent);
END;
$$;

REVOKE ALL ON FUNCTION public.record_login(TEXT, TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.record_login(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- Migration: 20260801072720_46838b78-d280-41d8-a0d4-96da439a7c16.sql
-- ============================================================

-- Lock down SECURITY DEFINER / trigger functions from public + anon callers.

-- Trigger-only functions: never callable directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_organization() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Maintenance job: service role / scheduler only.
REVOKE ALL ON FUNCTION public.apply_log_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_log_retention() TO service_role;

-- Helpers used inside RLS policies and app RPCs: signed-in users only, never anon.
REVOKE ALL ON FUNCTION public.can_manage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ensure_owner_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_owner_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_login(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login(text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.retention_preview(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retention_preview(uuid, integer) TO authenticated, service_role;

-- ============================================================
-- Migration: 20260801084000_create_rag_datasets.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.ai_dataset_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.ai_datasets(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  row_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  searchable_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.ai_datasets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'document',
  source_uri TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.ai_datasets(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  row_id UUID REFERENCES public.ai_dataset_rows(id) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  token_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_dataset_rows_dataset_idx ON public.ai_dataset_rows(dataset_id);
CREATE INDEX IF NOT EXISTS knowledge_sources_dataset_idx ON public.knowledge_sources(dataset_id);
CREATE INDEX IF NOT EXISTS rag_chunks_org_dataset_idx ON public.rag_chunks(org_id, dataset_id);
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx ON public.rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS rag_chunks_content_fts_idx ON public.rag_chunks USING gin (to_tsvector('english', content));

ALTER TABLE public.ai_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_dataset_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view datasets" ON public.ai_datasets
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers create datasets" ON public.ai_datasets
  FOR INSERT TO authenticated WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers update datasets" ON public.ai_datasets
  FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers delete datasets" ON public.ai_datasets
  FOR DELETE TO authenticated USING (public.can_manage(org_id));

CREATE POLICY "Members view dataset rows" ON public.ai_dataset_rows
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers manage dataset rows" ON public.ai_dataset_rows
  FOR ALL TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

CREATE POLICY "Members view knowledge sources" ON public.knowledge_sources
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers manage knowledge sources" ON public.knowledge_sources
  FOR ALL TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

CREATE POLICY "Members view rag chunks" ON public.rag_chunks
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers manage rag chunks" ON public.rag_chunks
  FOR ALL TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_datasets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_dataset_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_chunks TO authenticated;
GRANT ALL ON public.ai_datasets TO service_role;
GRANT ALL ON public.ai_dataset_rows TO service_role;
GRANT ALL ON public.knowledge_sources TO service_role;
GRANT ALL ON public.rag_chunks TO service_role;

CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding VECTOR(768),
  match_count INTEGER DEFAULT 8,
  filter_org_id UUID DEFAULT NULL,
  filter_dataset_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  dataset_id UUID,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    rc.id,
    rc.dataset_id,
    rc.source_id,
    rc.content,
    rc.metadata,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM public.rag_chunks rc
  WHERE rc.embedding IS NOT NULL
    AND (filter_org_id IS NULL OR rc.org_id = filter_org_id)
    AND (filter_dataset_id IS NULL OR rc.dataset_id = filter_dataset_id)
    AND (filter_org_id IS NULL OR public.is_org_member(rc.org_id) OR auth.role() = 'service_role')
  ORDER BY rc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.match_rag_chunks(VECTOR(768), INTEGER, UUID, UUID) TO authenticated, service_role;


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
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
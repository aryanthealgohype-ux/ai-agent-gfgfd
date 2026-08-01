import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { permissionsForRoles, highestRole } from "@/lib/permissions";

const deviceInput = z.object({
  deviceId: z.string().trim().min(8).max(64),
  label: z.string().trim().max(120).optional(),
  userAgent: z.string().trim().max(400).optional(),
  platform: z.string().trim().max(80).optional(),
});

/**
 * Single round trip the dashboard waits on before it renders: identity,
 * organization, roles, permissions, agent status, notifications and devices.
 */
export const getSessionBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    // Grants the seeded owner their role the first time they arrive.
    await supabase.rpc("ensure_owner_role");

    const [{ data: profile }, { data: memberships }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, full_name, avatar_url, phone, bio, company, website, timezone, language, theme, two_factor_enabled, last_login_at, last_seen_at, created_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("org_members")
        .select("org_id, created_at, organizations(id, name, slug)")
        .order("created_at", { ascending: true }),
      supabase.from("user_roles").select("role, org_id").eq("user_id", userId),
    ]);

    const orgs = (memberships ?? [])
      .map((m) => m.organizations)
      .filter((o): o is { id: string; name: string; slug: string } => Boolean(o));
    const activeOrg = orgs[0] ?? null;

    const roles = (roleRows ?? [])
      .filter((r) => !activeOrg || r.org_id === activeOrg.id)
      .map((r) => r.role as string);

    const [agentsResult, notificationsResult, devicesResult, pendingResult] = await Promise.all([
      supabase.from("agents").select("id, name, slug, status, safety_rating, category"),
      supabase
        .from("notifications")
        .select("id, title, body, severity, created_at, read_at")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("user_devices")
        .select("id")
        .eq("user_id", userId)
        .is("revoked_at", null),
      supabase.from("approvals").select("id").eq("status", "pending"),
    ]);

    const agents = agentsResult.data ?? [];

    return {
      userId,
      email: (claims["email"] as string | undefined) ?? profile?.email ?? null,
      profile: profile ?? null,
      orgs,
      activeOrg,
      roles,
      role: highestRole(roles),
      permissions: permissionsForRoles(roles),
      canManage: roles.some((r) => r === "owner" || r === "admin" || r === "manager"),
      agentSummary: {
        total: agents.length,
        active: agents.filter((a) => a.status === "active").length,
        highRisk: agents.filter((a) => (a.safety_rating ?? 0) >= 4).length,
      },
      notifications: notificationsResult.data ?? [],
      notificationCount: (notificationsResult.data ?? []).length,
      activeDevices: (devicesResult.data ?? []).length,
      pendingApprovals: (pendingResult.data ?? []).length,
    };
  });

/** Called right after a successful sign-in: stamps last login + device row. */
export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => deviceInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("record_login", {
      _device_id: data.deviceId,
      _label: data.label ?? "",
      _user_agent: data.userAgent ?? "",
      _platform: data.platform ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        event: z.enum(["sign_out", "sign_out_all", "password_change", "profile_update"]),
        deviceId: z.string().trim().max(64).optional(),
        detail: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await context.supabase.from("login_history").insert({
      user_id: context.userId,
      event: data.event,
      device_id: data.deviceId ?? null,
      detail: data.detail ?? null,
    });
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(40).optional().nullable(),
        bio: z.string().trim().max(600).optional().nullable(),
        company: z.string().trim().max(120).optional().nullable(),
        website: z.string().trim().max(200).optional().nullable(),
        avatarUrl: z.string().trim().max(500).optional().nullable(),
        timezone: z.string().trim().min(1).max(64),
        language: z.string().trim().min(2).max(12),
        theme: z.enum(["light", "dark", "system"]),
        twoFactorEnabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: updated, error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone ?? null,
        bio: data.bio ?? null,
        company: data.company ?? null,
        website: data.website ?? null,
        avatar_url: data.avatarUrl ?? null,
        timezone: data.timezone,
        language: data.language,
        theme: data.theme,
        two_factor_enabled: data.twoFactorEnabled,
      })
      .eq("id", context.userId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Profile could not be updated.");

    await context.supabase
      .from("login_history")
      .insert({ user_id: context.userId, event: "profile_update" });
    return { ok: true };
  });

export const listDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_devices")
      .select("id, device_id, label, user_agent, platform, last_seen_at, revoked_at, created_at")
      .eq("user_id", context.userId)
      .order("last_seen_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const revokeDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("user_devices")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    await context.supabase
      .from("login_history")
      .insert({ user_id: context.userId, event: "device_revoked", detail: data.id });
    return { ok: true };
  });

export const revokeAllDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("user_devices")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    await context.supabase
      .from("login_history")
      .insert({ user_id: context.userId, event: "sign_out_all" });
    return { ok: true };
  });

export const listLoginHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("login_history")
      .select("id, event, device_id, user_agent, detail, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

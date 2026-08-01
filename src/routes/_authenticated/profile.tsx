import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getSessionBootstrap,
  listDevices,
  listLoginHistory,
  revokeAllDevices,
  revokeDevice,
  updateProfile,
} from "@/lib/account.functions";
import { PERMISSION_LABELS, ROLE_LABELS, type Role } from "@/lib/permissions";
import { getDeviceId } from "@/lib/session";
import { useTheme, type ThemeChoice } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile | AI Operating System" },
      {
        name: "description",
        content:
          "Manage your identity, preferences, two-factor readiness, active devices and login history for the AI agent command center.",
      },
      { property: "og:title", content: "Your Profile | AI Operating System" },
      {
        property: "og:description",
        content: "Manage your identity, preferences, active devices and login history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const TIMEZONES = ["UTC", "Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore"];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

function ProfilePage() {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const fetchBootstrap = useServerFn(getSessionBootstrap);
  const fetchDevices = useServerFn(listDevices);
  const fetchHistory = useServerFn(listLoginHistory);
  const saveProfile = useServerFn(updateProfile);
  const dropDevice = useServerFn(revokeDevice);
  const dropAllDevices = useServerFn(revokeAllDevices);

  const { data: session } = useQuery({ queryKey: ["session"], queryFn: () => fetchBootstrap() });
  const { data: devices = [] } = useQuery({ queryKey: ["devices"], queryFn: () => fetchDevices() });
  const { data: history = [] } = useQuery({ queryKey: ["login-history"], queryFn: () => fetchHistory() });

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    bio: "",
    company: "",
    website: "",
    avatarUrl: "",
    timezone: "UTC",
    language: "en",
    theme: "system" as ThemeChoice,
    twoFactorEnabled: false,
  });

  useEffect(() => {
    const profile = session?.profile;
    if (!profile) return;
    setForm({
      fullName: profile.full_name ?? "",
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      company: profile.company ?? "",
      website: profile.website ?? "",
      avatarUrl: profile.avatar_url ?? "",
      timezone: profile.timezone ?? "UTC",
      language: profile.language ?? "en",
      theme: (profile.theme as ThemeChoice) ?? "system",
      twoFactorEnabled: profile.two_factor_enabled ?? false,
    });
  }, [session?.profile]);

  const save = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          fullName: form.fullName,
          phone: form.phone || null,
          bio: form.bio || null,
          company: form.company || null,
          website: form.website || null,
          avatarUrl: form.avatarUrl || null,
          timezone: form.timezone,
          language: form.language,
          theme: form.theme,
          twoFactorEnabled: form.twoFactorEnabled,
        },
      }),
    onSuccess: () => {
      setTheme(form.theme);
      toast.success("Profile saved.");
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["login-history"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => dropDevice({ data: { id } }),
    onSuccess: () => {
      toast.success("Device revoked.");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["login-history"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const signOutEverywhere = useMutation({
    mutationFn: async () => {
      await dropAllDevices();
      await supabase.auth.signOut({ scope: "global" });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.assign("/auth");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const currentDeviceId = typeof window !== "undefined" ? getDeviceId() : "";
  const role = (session?.role ?? "employee") as Role;
  const initials = useMemo(() => {
    const source = form.fullName || session?.email || "U";
    return source
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [form.fullName, session?.email]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identity, preferences, security posture and every device signed into your account.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Avatar className="size-16">
            {form.avatarUrl && <AvatarImage src={form.avatarUrl} alt={form.fullName || "Avatar"} />}
            <AvatarFallback className="text-lg">{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {form.fullName || "Unnamed user"}
            </p>
            <p className="truncate text-sm text-muted-foreground">{session?.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
              {session?.activeOrg && <Badge variant="outline">{session.activeOrg.name}</Badge>}
              <Badge variant="outline">
                {session?.profile?.last_login_at
                  ? `Last login ${new Date(session.profile.last_login_at).toLocaleString()}`
                  : "First session"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input id="full-name" value={form.fullName} maxLength={120} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={session?.email ?? ""} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} maxLength={40} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={form.company} maxLength={120} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={form.website} maxLength={200} placeholder="https://" onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar image URL</Label>
            <Input id="avatar" value={form.avatarUrl} maxLength={500} placeholder="https://" onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} value={form.bio} maxLength={600} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Time zone</Label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              value={form.theme}
              onChange={(e) => {
                const next = e.target.value as ThemeChoice;
                setForm({ ...form, theme: next });
                setTheme(next);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="system">Match system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                Marks your account as MFA-ready. Enrollment prompts appear once a second factor is enabled for the workspace.
              </p>
            </div>
            <Switch
              checked={form.twoFactorEnabled}
              onCheckedChange={(value) => setForm({ ...form, twoFactorEnabled: value })}
            />
          </div>

          <div className="sm:col-span-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.fullName.trim()}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />} Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Passwords are hashed and stored by the platform auth provider — never by this app.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              if (!session?.email) return;
              const { error } = await supabase.auth.resetPasswordForEmail(session.email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              if (error) toast.error(error.message);
              else toast.success("Password change link sent to your inbox.");
            }}
          >
            Change password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions for {ROLE_LABELS[role] ?? role}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {(session?.permissions ?? []).map((permission) => (
            <Badge key={permission} variant="secondary" className="text-[11px]">
              <ShieldCheck className="size-3" /> {PERMISSION_LABELS[permission] ?? permission}
            </Badge>
          ))}
          {!(session?.permissions ?? []).length && (
            <p className="text-sm text-muted-foreground">No elevated permissions on this workspace.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Active sessions &amp; devices</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOutEverywhere.mutate()}
            disabled={signOutEverywhere.isPending}
          >
            <LogOut className="size-4" /> Log out from all devices
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {devices.map((device) => {
            const isCurrent = device.device_id === currentDeviceId;
            return (
              <div
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                    <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" />
                    {device.label ?? "Unknown device"}
                    {isCurrent && <Badge variant="secondary" className="text-[10px]">This device</Badge>}
                    {device.revoked_at && <Badge variant="outline" className="text-[10px]">Revoked</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Last seen {new Date(device.last_seen_at).toLocaleString()} · {device.platform ?? "—"}
                  </p>
                </div>
                {!device.revoked_at && !isCurrent && (
                  <Button variant="ghost" size="sm" onClick={() => revoke.mutate(device.id)}>
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
          {!devices.length && <p className="text-sm text-muted-foreground">No devices recorded yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Login history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-border pb-1.5 text-xs last:border-0">
              <span className="font-medium text-foreground">{entry.event.replace(/_/g, " ")}</span>
              <span className="truncate text-muted-foreground">{entry.detail ?? entry.device_id ?? "—"}</span>
              <span className="shrink-0 text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
          ))}
          {!history.length && <p className="text-sm text-muted-foreground">No sign-in events recorded yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

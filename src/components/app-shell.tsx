import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";
import {
  Bot,
  LayoutDashboard,
  ShieldCheck,
  Activity,
  Plug,
  Settings,
  ScrollText,
  LogOut,
  BookLock,
  Play,
  Webhook,
  UserRound,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listApprovals } from "@/lib/fleet.functions";
import { getSessionBootstrap, recordAuthEvent } from "@/lib/account.functions";
import { clearSessionMarkers, getDeviceId, isSessionExpired } from "@/lib/session";
import { ThemeToggle, useTheme } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/agents", label: "Agent fleet", short: "Agents", icon: Bot },
  { to: "/approvals", label: "Approvals", short: "Approve", icon: ShieldCheck },
  { to: "/runs", label: "Run history", short: "Runs", icon: Activity },
  { to: "/playbook", label: "Safety playbook", short: "Prompts", icon: BookLock },
  { to: "/deliveries", label: "Deliveries", short: "Hooks", icon: Webhook },
  { to: "/connectors", label: "Connectors", short: "Connect", icon: Plug },
  { to: "/settings", label: "Settings", short: "Settings", icon: Settings },
  { to: "/audit", label: "Audit log", short: "Audit", icon: ScrollText },
  { to: "/profile", label: "Your profile", short: "You", icon: UserRound },
] as const;

// Icon-first bar for phones: the five surfaces you touch during an active shift.
const MOBILE_NAV = ["/dashboard", "/agents", "/approvals", "/runs", "/profile"] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchSession = useServerFn(getSessionBootstrap);
  const fetchApprovals = useServerFn(listApprovals);
  const logAuthEvent = useServerFn(recordAuthEvent);
  useTheme();

  const { data: workspace } = useQuery({
    queryKey: ["session"],
    queryFn: () => fetchSession(),
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => fetchApprovals(),
    refetchInterval: 30000,
  });

  const pendingCount = (approvals as Array<{ status: string }>).filter(
    (a) => a.status === "pending",
  ).length;

  async function signOut(reason: "manual" | "expired" = "manual") {
    await queryClient.cancelQueries();
    if (reason === "manual") {
      try {
        await logAuthEvent({ data: { event: "sign_out", deviceId: getDeviceId() } });
      } catch {
        // Never block sign-out on bookkeeping.
      }
    }
    queryClient.clear();
    clearSessionMarkers();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // "Remember me" off means the session only lives for a short window.
  useEffect(() => {
    if (isSessionExpired()) void signOut("expired");
    const timer = setInterval(() => {
      if (isSessionExpired()) void signOut("expired");
    }, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link to="/dashboard" className="mb-8 flex min-w-0 items-center gap-2 px-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-foreground">
              AI Operating System
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Fleet command center
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
                {item.to === "/approvals" && pendingCount > 0 && (
                  <Badge className="ml-auto shrink-0">{pendingCount}</Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 space-y-3 rounded-lg border border-border p-3">
          <Link to="/profile" className="block min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {workspace?.profile?.full_name ?? workspace?.email ?? "Signed in"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{workspace?.activeOrg?.name}</p>
          </Link>
          <div className="flex flex-wrap gap-1">
            {(workspace?.roles ?? []).map((role) => (
              <Badge key={role} variant="secondary" className="text-[10px] uppercase">
                {role}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
            {(workspace?.notificationCount ?? 0) > 0 && (
              <Badge variant="outline" className="gap-1">
                <Bell className="size-3" /> {workspace?.notificationCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void signOut("manual")}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>


      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: identity + sign out only, navigation lives at the bottom. */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-2.5 lg:hidden">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {workspace?.activeOrg?.name ?? "AI Operating System"}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {workspace?.profile?.full_name ?? workspace?.email ?? "Signed in"}
              </span>

            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/connectors"
              aria-label="Connectors"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <Plug className="size-4" />
            </Link>
            <Link
              to="/settings"
              aria-label="Settings"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <Settings className="size-4" />
            </Link>
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => void signOut("manual")}
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-8 sm:pb-10 sm:pt-6">{children}</main>
      </div>

      {/* Fixed primary action: jump straight to launching a run. */}
      <Link
        to="/agents"
        aria-label="Run an agent"
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 lg:bottom-6 lg:right-6"
      >
        <Play className="size-4" />
        <span className="hidden sm:inline">Run agent</span>
      </Link>

      {/* Icon-based bottom navigation (mobile). */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((to) => {
          const item = NAV.find((n) => n.to === to)!;
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.short}
              {item.to === "/approvals" && pendingCount > 0 && (
                <span className="absolute right-4 top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

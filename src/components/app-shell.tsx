import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import {
  Bot,
  LayoutDashboard,
  ShieldCheck,
  Activity,
  Plug,
  Settings,
  ScrollText,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getWorkspace } from "@/lib/fleet.functions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "Agent fleet", icon: Bot },
  { to: "/approvals", label: "Approvals", icon: ShieldCheck },
  { to: "/runs", label: "Run history", icon: Activity },
  { to: "/connectors", label: "Connectors", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/audit", label: "Audit log", icon: ScrollText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchWorkspace = useServerFn(getWorkspace);

  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => fetchWorkspace(),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-foreground">AI Operating System</span>
            <span className="block text-xs text-muted-foreground">Fleet command center</span>
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
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-lg border border-border p-3">
          <p className="truncate text-sm font-medium text-foreground">
            {workspace?.profile?.full_name ?? workspace?.profile?.email ?? "Signed in"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{workspace?.activeOrg?.name}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(workspace?.roles ?? []).map((role) => (
              <Badge key={role} variant="secondary" className="text-[10px] uppercase">
                {role}
              </Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                pathname.startsWith(item.to)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

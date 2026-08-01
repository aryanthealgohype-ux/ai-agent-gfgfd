import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Bell,
  Bot,
  DollarSign,
  Loader2,
  Plug,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { getOverview, listConnectors } from "@/lib/fleet.functions";
import { getSessionBootstrap } from "@/lib/account.functions";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/safety-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Fleet Dashboard | AI Operating System" },
      {
        name: "description",
        content:
          "Live command center for your AI agent fleet: runs, spend, safety approvals and activity in one view.",
      },
      { property: "og:title", content: "Fleet Dashboard | AI Operating System" },
      {
        property: "og:description",
        content: "Live command center for your AI agent fleet: runs, spend, safety approvals and activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchOverview = useServerFn(getOverview);
  const fetchSession = useServerFn(getSessionBootstrap);
  const fetchConnectors = useServerFn(listConnectors);

  const overviewQuery = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const sessionQuery = useQuery({ queryKey: ["session"], queryFn: () => fetchSession() });
  const connectorsQuery = useQuery({ queryKey: ["connectors"], queryFn: () => fetchConnectors() });

  // Everything the dashboard shows is real data — render only once it's in.
  if (overviewQuery.isLoading || sessionQuery.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="relative grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Bot className="size-5" />
            <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30" />
          </span>
          <p className="text-sm font-medium text-foreground">Loading your command center…</p>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const session = sessionQuery.data;
  const data = overviewQuery.data;
  const runs = data?.runs ?? [];
  const agents = data?.agents ?? [];
  const connectors = connectorsQuery.data ?? [];
  const connected = connectors.filter((c) => c.connected);
  const spend = runs.reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const successRate = runs.length ? Math.round((succeeded / runs.length) * 100) : 0;
  const firstName = (session?.profile?.full_name ?? session?.email ?? "there").split(/[\s@]+/)[0];
  const role = (session?.role ?? "employee") as Role;
  const initials = (session?.profile?.full_name ?? session?.email ?? "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const stats = [
    { label: "Active agents", value: `${session?.agentSummary.active ?? 0}/${session?.agentSummary.total ?? agents.length}`, icon: Bot },
    { label: "Runs (30 days)", value: String(runs.length), icon: Activity },
    { label: "Pending approvals", value: String(data?.pendingApprovals ?? 0), icon: ShieldAlert },
    { label: "Spend (30 days)", value: `$${spend.toFixed(4)}`, icon: DollarSign },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Identity block: who is signed in, where, and with what authority. */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Avatar className="size-14">
            {session?.profile?.avatar_url && (
              <AvatarImage src={session.profile.avatar_url} alt={session.profile.full_name ?? "Avatar"} />
            )}
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Welcome back, {firstName}.
            </h1>
            <p className="truncate text-sm text-muted-foreground">{session?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {session?.activeOrg && <Badge variant="outline">{session.activeOrg.name}</Badge>}
              <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Online
              </Badge>
              <span className="text-xs text-muted-foreground">
                {session?.profile?.last_login_at
                  ? `Last login ${new Date(session.profile.last_login_at).toLocaleString()}`
                  : "First session"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/profile">Profile</Link>
            </Button>
            <Button asChild>
              <Link to="/agents">Open agent fleet</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-xl font-semibold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {successRate}% success rate across the last {runs.length} runs ·{" "}
        {session?.agentSummary.highRisk ?? 0} agents gated at safety 4–5.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Notifications</CardTitle>
            <Badge variant={session?.notificationCount ? "default" : "outline"}>
              <Bell className="size-3" /> {session?.notificationCount ?? 0}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {(session?.notifications ?? []).slice(0, 6).map((n) => (
              <div key={n.id} className="border-b border-border pb-2 last:border-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground">
                  {n.body ?? ""} · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {!(session?.notifications ?? []).length && (
              <p className="text-sm text-muted-foreground">No unread notifications.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agents.slice(0, 7).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0">
                <span className="truncate text-foreground">{agent.name}</span>
                <Badge variant={agent.status === "active" ? "secondary" : "outline"} className="shrink-0 text-[10px] uppercase">
                  {agent.status}
                </Badge>
              </div>
            ))}
            {!agents.length && <p className="text-sm text-muted-foreground">No agents provisioned yet.</p>}
          </CardContent>
        </Card>

        <FleetActivityStream className="lg:col-span-2" />



        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.slice(0, 8).map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{run.agents?.name ?? "Agent"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={run.status} />
              </div>
            ))}
            {!runs.length && (
              <p className="text-sm text-muted-foreground">No runs yet. Pick an agent and send it a task.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Connected accounts</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/connectors">
                <Plug className="size-4" /> Manage
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {connected.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-[11px]">
                <ShieldCheck className="size-3" /> {c.label}
              </Badge>
            ))}
            {!connected.length && (
              <p className="text-sm text-muted-foreground">
                No connectors linked yet — connect one to let agents read and publish.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.recentLogs ?? []).slice(0, 12).map((log) => (
            <p key={log.id} className="font-mono text-xs text-muted-foreground">
              <span className="text-foreground">[{log.level}]</span> {log.message}
            </p>
          ))}
          {!(data?.recentLogs ?? []).length && (
            <p className="text-sm text-muted-foreground">Execution logs will stream here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

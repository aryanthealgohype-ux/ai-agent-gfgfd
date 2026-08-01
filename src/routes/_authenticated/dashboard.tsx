import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Bot, DollarSign, ShieldAlert } from "lucide-react";
import { getOverview } from "@/lib/fleet.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/safety-badge";
import { Button } from "@/components/ui/button";

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
  const { data, isLoading } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });

  const runs = data?.runs ?? [];
  const agents = data?.agents ?? [];
  const spend = runs.reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const successRate = runs.length ? Math.round((succeeded / runs.length) * 100) : 0;

  const stats = [
    { label: "Active agents", value: `${agents.filter((a) => a.status === "active").length}/${agents.length}`, icon: Bot },
    { label: "Runs (30 days)", value: String(runs.length), icon: Activity },
    { label: "Pending approvals", value: String(data?.pendingApprovals ?? 0), icon: ShieldAlert },
    { label: "Spend (30 days)", value: `$${spend.toFixed(4)}`, icon: DollarSign },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Fleet dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {successRate}% success rate across the last {runs.length} runs.
          </p>
        </div>
        <Button asChild>
          <Link to="/agents">Open agent fleet</Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.slice(0, 8).map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {run.agents?.name ?? "Agent"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>
            ))}
            {!runs.length && (
              <p className="text-sm text-muted-foreground">
                No runs yet. Pick an agent and send it a task.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity stream</CardTitle>
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
    </div>
  );
}

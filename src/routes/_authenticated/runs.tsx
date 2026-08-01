import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listRuns } from "@/lib/fleet.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/safety-badge";
import { TranscriptExport } from "@/components/run-transcript-export";
import { FleetActivityStream } from "@/components/fleet-activity-stream";


export const Route = createFileRoute("/_authenticated/runs")({
  head: () => ({
    meta: [
      { title: "Run History & Analytics | AI Operating System" },
      {
        name: "description",
        content:
          "Every agent execution with status, latency, token usage and cost, plus fleet-wide spend analytics.",
      },
      { property: "og:title", content: "Run History & Analytics | AI Operating System" },
      {
        property: "og:description",
        content: "Every agent execution with status, latency, token usage and cost.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RunsPage,
});

function RunsPage() {
  const fetchRuns = useServerFn(listRuns);
  const { data: runs = [], isLoading } = useQuery({ queryKey: ["runs"], queryFn: () => fetchRuns() });
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const statuses = useMemo(
    () => ["all", ...Array.from(new Set(runs.map((r) => r.status)))],
    [runs],
  );
  const filtered = runs.filter((r) => status === "all" || r.status === status);

  const spendByAgent = useMemo(() => {
    const map = new Map<string, { name: string; cost: number; runs: number }>();
    for (const run of runs) {
      const name = run.agents?.name ?? "Unknown";
      const entry = map.get(name) ?? { name, cost: 0, runs: 0 };
      entry.cost += Number(run.cost_usd ?? 0);
      entry.runs += 1;
      map.set(name, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost).slice(0, 6);
  }, [runs]);

  const maxCost = Math.max(...spendByAgent.map((s) => s.cost), 0.000001);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Run history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full execution trail with tokens, latency and cost per run.
        </p>
      </header>

      <FleetActivityStream />



      {Boolean(spendByAgent.length) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spendByAgent.map((row) => (
              <div key={row.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{row.name}</span>
                  <span className="text-muted-foreground">
                    ${row.cost.toFixed(6)} · {row.runs} runs
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max((row.cost / maxCost) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-1">
        {statuses.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={status === item ? "default" : "outline"}
            onClick={() => setStatus(item)}
          >
            {item.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading runs…</p>}

      <div className="space-y-2">
        {filtered.map((run) => (
          <Card key={run.id}>
            <CardContent className="space-y-2 p-4">
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                onClick={() => setExpanded(expanded === run.id ? null : run.id)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {run.agents?.name ?? "Agent"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()} · {run.model} ·{" "}
                    {run.duration_ms ? `${run.duration_ms}ms` : "—"} · $
                    {Number(run.cost_usd ?? 0).toFixed(6)}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </button>
              {expanded === run.id && (
                <div className="space-y-2 border-t border-border pt-2 text-sm">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Input</p>
                  <p className="whitespace-pre-wrap text-foreground">{run.input}</p>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Output</p>
                  <p className="whitespace-pre-wrap text-foreground">
                    {run.output ?? run.error ?? "No output recorded."}
                  </p>
                  <TranscriptExport runId={run.id} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && !filtered.length && (
          <p className="text-sm text-muted-foreground">No runs match this filter.</p>
        )}
      </div>
    </div>
  );
}

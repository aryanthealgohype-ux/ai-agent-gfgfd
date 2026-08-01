import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Radio, Loader2, Pause, Play, ArrowDownToLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFleetActivity, getRunLabels } from "@/lib/fleet.functions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LogRow = { id: string; run_id: string; level: string; message: string; created_at: string };

type RunMeta = {
  id: string;
  status: string;
  input: string;
  created_at: string;
  completed_at?: string | null;
  agents: { name: string; slug: string; safety_rating: number; category?: string } | null;
};

const LEVEL_STYLE: Record<string, string> = {
  error: "text-destructive",
  warn: "text-safe-mid",
  warning: "text-safe-mid",
  info: "text-muted-foreground",
  debug: "text-muted-foreground/70",
};

const LEVEL_FILTERS = [
  { key: "all", label: "All events" },
  { key: "problems", label: "Errors & warnings" },
  { key: "error", label: "Errors only" },
] as const;

type LevelFilter = (typeof LEVEL_FILTERS)[number]["key"];

function matchesLevel(level: string, filter: LevelFilter) {
  if (filter === "all") return true;
  const normalized = level.toLowerCase();
  if (filter === "error") return normalized === "error";
  return normalized === "error" || normalized === "warn" || normalized === "warning";
}

/**
 * Fleet-wide live log tail: every run in the workspace on one stream.
 * Seeds from the server, then streams `run_logs` inserts and `agent_runs`
 * status changes over realtime. RLS keeps the socket scoped to the org.
 */
export function FleetActivityStream({ className }: { className?: string }) {
  const fetchActivity = useServerFn(getFleetActivity);
  const fetchLabels = useServerFn(getRunLabels);

  const [streamed, setStreamed] = useState<LogRow[]>([]);
  const [liveRuns, setLiveRuns] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, RunMeta>>({});
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState<LevelFilter>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pendingLabels = useRef<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["fleet-activity"],
    queryFn: () => fetchActivity({ data: { limit: 200 } }),
    // Realtime carries new rows; polling is only the fallback if the socket drops.
    refetchInterval: live ? false : 6000,
  });

  const seedLogs = (data?.logs ?? []) as LogRow[];
  const seedRuns = (data?.runs ?? []) as RunMeta[];
  const activeRuns = (data?.active ?? []) as RunMeta[];

  const runMeta = useMemo(() => {
    const map: Record<string, RunMeta> = {};
    for (const run of [...seedRuns, ...activeRuns]) map[run.id] = run;
    return { ...map, ...labels };
  }, [seedRuns, activeRuns, labels]);

  // Resolve agent names for runs that only appeared over the socket.
  const resolveLabels = useCallback(
    async (runIds: string[]) => {
      const missing = runIds.filter((id) => !pendingLabels.current.has(id));
      if (!missing.length) return;
      missing.forEach((id) => pendingLabels.current.add(id));
      try {
        const rows = (await fetchLabels({ data: { runIds: missing.slice(0, 50) } })) as RunMeta[];
        setLabels((prev) => {
          const next = { ...prev };
          for (const row of rows) next[row.id] = row;
          return next;
        });
      } catch {
        missing.forEach((id) => pendingLabels.current.delete(id));
      }
    },
    [fetchLabels],
  );

  useEffect(() => {
    const channel = supabase
      .channel("fleet-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "run_logs" },
        (payload) => {
          const row = payload.new as LogRow;
          setStreamed((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [...prev, row].slice(-400),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_runs" },
        (payload) => {
          const row = payload.new as { id?: string; status?: string };
          if (!row?.id || !row.status) return;
          setLiveRuns((prev) => ({ ...prev, [row.id!]: row.status! }));
        },
      )
      .subscribe((state) => setLive(state === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const logs = useMemo(() => {
    const byId = new Map<string, LogRow>();
    for (const row of [...seedLogs, ...streamed]) byId.set(row.id, row);
    return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [seedLogs, streamed]);

  useEffect(() => {
    const unknown = [...new Set(logs.map((l) => l.run_id))].filter((id) => !runMeta[id]);
    if (unknown.length) void resolveLabels(unknown);
  }, [logs, runMeta, resolveLabels]);

  const agentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const run of Object.values(runMeta)) {
      if (run.agents) seen.set(run.agents.slug, run.agents.name);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [runMeta]);

  const visible = useMemo(
    () =>
      logs.filter((log) => {
        if (!matchesLevel(log.level, level)) return false;
        if (agentFilter === "all") return true;
        return runMeta[log.run_id]?.agents?.slug === agentFilter;
      }),
    [logs, level, agentFilter, runMeta],
  );

  useEffect(() => {
    if (paused) return;
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [visible.length, paused]);

  const inFlight = useMemo(() => {
    const map = new Map<string, RunMeta>();
    for (const run of activeRuns) map.set(run.id, run);
    // Realtime status changes win over the seeded snapshot.
    for (const [id, status] of Object.entries(liveRuns)) {
      const meta = runMeta[id];
      if (!meta) continue;
      if (status === "queued" || status === "running") map.set(id, { ...meta, status });
      else map.delete(id);
    }
    return [...map.values()];
  }, [activeRuns, liveRuns, runMeta]);

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Fleet activity</p>
          <p className="text-xs text-muted-foreground">
            Live events from every agent run in this workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide",
              live ? "text-safe-low" : "text-muted-foreground",
            )}
          >
            {inFlight.length ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Radio className="size-3" />
            )}
            {live ? "Live" : "Polling"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            <span className="hidden sm:inline">{paused ? "Resume" : "Pause"}</span>
          </Button>
        </div>
      </div>

      {inFlight.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border bg-muted/40 px-4 py-2">
          {inFlight.map((run) => (
            <Link
              key={run.id}
              to="/agents/$slug"
              params={{ slug: run.agents?.slug ?? "" }}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground hover:bg-accent"
            >
              <Loader2 className="size-3 animate-spin text-primary" />
              <span className="max-w-40 truncate">{run.agents?.name ?? "Agent"}</span>
              <span className="text-muted-foreground">{run.status}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {LEVEL_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setLevel(option.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                level === option.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select
          value={agentFilter}
          onChange={(event) => setAgentFilter(event.target.value)}
          className="ml-auto h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          aria-label="Filter by agent"
        >
          <option value="all">All agents</option>
          {agentOptions.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-96 space-y-1 overflow-y-auto px-4 py-3">
        {isLoading && <p className="text-xs text-muted-foreground">Attaching to the stream…</p>}
        {!isLoading && visible.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No matching events yet. Run an agent and events will appear here instantly.
          </p>
        )}
        {visible.map((log) => {
          const meta = runMeta[log.run_id];
          return (
            <div key={log.id} className="font-mono text-[11px] leading-relaxed break-words">
              <span className="text-muted-foreground/60">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>{" "}
              <Badge
                variant="outline"
                className="mr-1 h-4 px-1 font-sans text-[10px] font-medium"
                title={meta?.input ?? undefined}
              >
                {meta?.agents?.name ?? `run ${log.run_id.slice(0, 8)}`}
              </Badge>
              <span className={cn("font-semibold", LEVEL_STYLE[log.level] ?? "text-foreground")}>
                [{log.level}]
              </span>{" "}
              <span className={cn(LEVEL_STYLE[log.level] ?? "text-foreground")}>{log.message}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {paused && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <ArrowDownToLine className="size-3" />
          Auto-scroll paused — new events still arrive live.
        </div>
      )}
    </div>
  );
}

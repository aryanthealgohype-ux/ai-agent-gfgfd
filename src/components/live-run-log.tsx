import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Radio, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRunLogs } from "@/lib/fleet.functions";
import { cn } from "@/lib/utils";

export type RunLogRow = {
  id: string;
  level: string;
  message: string;
  created_at: string;
};

const LEVEL_STYLE: Record<string, string> = {
  error: "text-destructive",
  warn: "text-safe-mid",
  warning: "text-safe-mid",
  info: "text-muted-foreground",
  debug: "text-muted-foreground/70",
};

/**
 * Live execution log for a single run.
 * Seeds from the server, then streams inserts over realtime.
 */
export function LiveRunLog({
  runId,
  status,
  className,
}: {
  runId: string | null;
  status?: string | null;
  className?: string;
}) {
  const fetchLogs = useServerFn(getRunLogs);
  const [streamed, setStreamed] = useState<RunLogRow[]>([]);
  const [live, setLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: seed = [] } = useQuery({
    queryKey: ["run-logs", runId],
    queryFn: () => fetchLogs({ data: { runId: runId! } }),
    enabled: Boolean(runId),
    // Realtime carries new rows; this is a safety net if the socket drops.
    refetchInterval: live ? false : 4000,
  });

  useEffect(() => {
    setStreamed([]);
    setLive(false);
    if (!runId) return;

    const channel = supabase
      .channel(`run-logs-${runId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "run_logs", filter: `run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as RunLogRow;
          setStreamed((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe((state) => setLive(state === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId]);

  const logs = useMemo(() => {
    const byId = new Map<string, RunLogRow>();
    for (const row of [...(seed as RunLogRow[]), ...streamed]) byId.set(row.id, row);
    return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [seed, streamed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs.length]);

  if (!runId) return null;

  const running = status === "queued" || status === "running";

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium text-foreground">Execution log</p>
        <span
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide",
            live ? "text-safe-low" : "text-muted-foreground",
          )}
        >
          {running ? <Loader2 className="size-3 animate-spin" /> : <Radio className="size-3" />}
          {live ? "Live" : "Polling"}
        </span>
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto px-4 py-3">
        {logs.length === 0 && (
          <p className="text-xs text-muted-foreground">Waiting for the first event…</p>
        )}
        {logs.map((log) => (
          <p key={log.id} className="font-mono text-[11px] leading-relaxed break-words">
            <span className="text-muted-foreground/60">
              {new Date(log.created_at).toLocaleTimeString()}
            </span>{" "}
            <span className={cn("font-semibold", LEVEL_STYLE[log.level] ?? "text-foreground")}>
              [{log.level}]
            </span>{" "}
            <span className={cn(LEVEL_STYLE[log.level] ?? "text-foreground")}>{log.message}</span>
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

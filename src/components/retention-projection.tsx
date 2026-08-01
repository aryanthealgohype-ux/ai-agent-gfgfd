import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, HardDrive } from "lucide-react";
import { getRetentionPreview } from "@/lib/guardrails.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function RetentionProjection({ days, archive }: { days: number; archive: boolean }) {
  const fetchPreview = useServerFn(getRetentionPreview);
  const [showSample, setShowSample] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["retention-preview", days],
    queryFn: () => fetchPreview({ data: { days } }),
    enabled: Number.isInteger(days) && days > 0,
  });

  const stats = data?.stats;
  const projection = useMemo(() => {
    if (!stats) return null;
    const keptBytes = Math.max(0, stats.live_bytes - stats.stale_bytes);
    // Steady state = daily growth × retention window, once the policy has been running for a full cycle.
    const steadyState = Number(stats.bytes_per_day) * days;
    const total = Math.max(keptBytes + stats.stale_bytes + stats.archived_bytes, 1);
    return {
      keptBytes,
      steadyState,
      keptPct: (keptBytes / total) * 100,
      stalePct: (stats.stale_bytes / total) * 100,
      archivedPct: (stats.archived_bytes / total) * 100,
    };
  }, [stats, days]);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <HardDrive className="size-4 text-muted-foreground" />
          Projected storage impact
        </p>
        {isFetching ? <span className="text-xs text-muted-foreground">recalculating…</span> : null}
      </div>

      {!stats || !projection ? (
        <p className="text-xs text-muted-foreground">Calculating projection…</p>
      ) : (
        <>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border">
            <div className="bg-primary" style={{ width: `${projection.keptPct}%` }} />
            <div className="bg-destructive/70" style={{ width: `${projection.stalePct}%` }} />
            <div className="bg-muted-foreground/50" style={{ width: `${projection.archivedPct}%` }} />
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <p className="font-medium text-foreground">Kept live</p>
              <p className="text-muted-foreground">
                {Math.max(0, stats.live_count - stats.stale_count).toLocaleString()} events ·{" "}
                {formatBytes(projection.keptBytes)}
              </p>
            </div>
            <div>
              <p className="font-medium text-destructive">
                {archive ? "To archive + purge" : "To purge"}
              </p>
              <p className="text-muted-foreground">
                {stats.stale_count.toLocaleString()} events · {formatBytes(stats.stale_bytes)}
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Already archived</p>
              <p className="text-muted-foreground">
                {stats.archived_count.toLocaleString()} events · {formatBytes(stats.archived_bytes)}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Growing at ~{Number(stats.events_per_day).toLocaleString()} events ·{" "}
            {formatBytes(Number(stats.bytes_per_day))} per day → steady state around{" "}
            <span className="font-medium text-foreground">{formatBytes(projection.steadyState)}</span> of
            live logs at {days} day{days === 1 ? "" : "s"}. Cutoff{" "}
            {new Date(stats.cutoff).toLocaleString()}.
          </p>
          <p className="text-xs text-muted-foreground">
            Last purge / archive run:{" "}
            <span className="font-medium text-foreground">
              {data?.lastRunAt ? new Date(data.lastRunAt).toLocaleString() : "never"}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSample((value) => !value)}>
              <Eye className="mr-1.5 size-3.5" />
              {showSample ? "Hide dry run" : "Dry run preview"}
            </Button>
            {days !== data?.savedDays ? (
              <Badge variant="outline" className="text-xs">
                unsaved: previewing {days}d vs saved {data?.savedDays}d
              </Badge>
            ) : null}
          </div>

          {showSample ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {stats.stale_count === 0
                  ? "Nothing would be removed at this retention window."
                  : `Showing the ${Math.min(25, stats.stale_count)} oldest of ${stats.stale_count.toLocaleString()} events that would be ${archive ? "archived then removed" : "permanently deleted"}. Nothing is changed until you apply the policy.`}
              </p>
              {(data?.sample ?? []).length ? (
                <div className="max-h-64 overflow-auto rounded-md border border-border bg-background">
                  {(data?.sample ?? []).map((row) => (
                    <div key={row.id} className="flex gap-2 border-b border-border/60 px-2 py-1.5 text-xs last:border-0">
                      <span className="shrink-0 font-mono text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                      <span className="shrink-0 uppercase text-muted-foreground">{row.level}</span>
                      <span className="truncate text-foreground">{row.message}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

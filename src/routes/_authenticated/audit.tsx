import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/fleet.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log | AI Operating System" },
      {
        name: "description",
        content:
          "Immutable trail of every agent edit, approval decision, connector change and workspace setting update.",
      },
      { property: "og:title", content: "Audit Log | AI Operating System" },
      {
        property: "og:description",
        content: "Immutable trail of every agent edit, approval decision and connector change.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const fetchAudit = useServerFn(listAuditLog);
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => fetchAudit(),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visible to admins and managers only. Every privileged action is recorded server-side.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading audit trail…</p>}
      {error && (
        <p className="text-sm text-destructive">
          You do not have permission to view the audit log.
        </p>
      )}

      <div className="space-y-2">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{entry.action}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.target_type ?? "—"} · {entry.target_id ?? "—"} ·{" "}
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[11px]">
                {entry.actor_id?.slice(0, 8) ?? "system"}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !error && !entries.length && (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        )}
      </div>
    </div>
  );
}

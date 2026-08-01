import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { decideApproval, listApprovals } from "@/lib/fleet.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SafetyBadge, StatusBadge } from "@/components/safety-badge";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue | AI Operating System" },
      {
        name: "description",
        content:
          "Human-in-the-loop queue for high-risk agent runs. Approve or deny before any action executes.",
      },
      { property: "og:title", content: "Approval Queue | AI Operating System" },
      {
        property: "og:description",
        content: "Approve or deny high-risk agent runs before anything executes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const queryClient = useQueryClient();
  const fetchApprovals = useServerFn(listApprovals);
  const decide = useServerFn(decideApproval);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => fetchApprovals(),
    refetchInterval: 8000,
  });

  async function submit(approvalId: string, approve: boolean) {
    setBusy(approvalId);
    try {
      const result = await decide({
        data: { approvalId, approve, reason: reasons[approvalId] ?? undefined },
      });
      toast[approve ? "success" : "info"](
        approve ? `Approved — run ${result.status}` : "Request denied",
      );
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Approval queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every high-risk run is held here. Nothing executes until an admin or manager approves it.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}

      <section className="space-y-3">
        {pending.map((approval) => (
          <Card key={approval.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{approval.agents?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(approval.created_at).toLocaleString()}
                  </p>
                </div>
                {approval.agents?.safety_rating != null && (
                  <SafetyBadge rating={approval.agents.safety_rating} />
                )}
              </div>
              <p className="rounded-lg bg-muted p-3 text-sm text-foreground">
                {approval.agent_runs?.input}
              </p>
              <Input
                placeholder="Decision note (optional)"
                value={reasons[approval.id] ?? ""}
                onChange={(event) =>
                  setReasons((prev) => ({ ...prev, [approval.id]: event.target.value }))
                }
              />
              <div className="flex gap-2">
                <Button disabled={busy === approval.id} onClick={() => submit(approval.id, true)}>
                  Approve & run
                </Button>
                <Button
                  variant="outline"
                  disabled={busy === approval.id}
                  onClick={() => submit(approval.id, false)}
                >
                  Deny
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !pending.length && (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              Nothing waiting for approval right now.
            </CardContent>
          </Card>
        )}
      </section>

      {Boolean(decided.length) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Decision history
          </h2>
          {decided.map((approval) => (
            <Card key={approval.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {approval.agents?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {approval.reason ?? "No note"} ·{" "}
                    {approval.decided_at ? new Date(approval.decided_at).toLocaleString() : "—"}
                  </p>
                </div>
                <StatusBadge status={approval.status} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Send } from "lucide-react";
import { drainDeliveryQueue, listDeliveries, retryDelivery } from "@/lib/guardrails.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({
    meta: [
      { title: "Webhook Deliveries & Dead Letters | AI Operating System" },
      {
        name: "description",
        content:
          "Monitor n8n webhook delivery attempts, automatic retries with exponential backoff, and safely reprocess dead-lettered callbacks.",
      },
      { property: "og:title", content: "Webhook Deliveries & Dead Letters | AI Operating System" },
      {
        property: "og:description",
        content: "Track n8n callback retries and reprocess dead-lettered deliveries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeliveriesPage,
});

const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-safe-low/15 text-safe-low",
  pending: "bg-muted text-muted-foreground",
  retrying: "bg-safe-mid/15 text-safe-mid",
  dead_letter: "bg-destructive/10 text-destructive",
};

function DeliveriesPage() {
  const queryClient = useQueryClient();
  const fetchDeliveries = useServerFn(listDeliveries);
  const retry = useServerFn(retryDelivery);
  const drain = useServerFn(drainDeliveryQueue);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => fetchDeliveries(),
    refetchInterval: 20000,
  });

  const dead = deliveries.filter((d) => d.status === "dead_letter");
  const inFlight = deliveries.filter((d) => d.status === "pending" || d.status === "retrying");
  const done = deliveries.filter((d) => d.status === "delivered");

  async function handleRetry(id: string) {
    setBusy(id);
    try {
      const result = await retry({ data: { id } });
      if (result.status === "delivered") toast.success("Delivered on retry");
      else if (result.status === "dead_letter") toast.error("Still failing — back in the dead-letter queue");
      else toast.warning("Failed again — scheduled for another automatic retry");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDrain() {
    setBusy("drain");
    try {
      const result = await drain();
      toast.success(`Processed ${result.processed} · delivered ${result.delivered} · failed ${result.failed}`);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function renderList(rows: typeof deliveries, emptyText: string) {
    if (!rows.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
    return (
      <div className="space-y-3">
        {rows.map((delivery) => (
          <div
            key={delivery.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border pb-3 last:border-0"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${STATUS_STYLE[delivery.status] ?? "bg-muted"}`}
                >
                  {delivery.status.replace("_", " ")}
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {delivery.agents?.name ?? "Agent"}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {delivery.event}
                </Badge>
              </div>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{delivery.url}</p>
              <p className="text-xs text-muted-foreground">
                {delivery.attempts}/{delivery.max_attempts} attempts
                {delivery.last_status_code ? ` · HTTP ${delivery.last_status_code}` : ""} ·{" "}
                {delivery.status === "delivered"
                  ? `delivered ${new Date(delivery.delivered_at ?? delivery.updated_at).toLocaleString()}`
                  : `next attempt ${new Date(delivery.next_attempt_at).toLocaleString()}`}
                {(delivery.replay_count ?? 0) > 0
                  ? ` · reprocessed ${delivery.replay_count}×${delivery.last_replayed_at ? ` (last ${new Date(delivery.last_replayed_at).toLocaleString()})` : ""}`
                  : ""}
              </p>
              <p className="truncate font-mono text-[10px] text-muted-foreground/80">
                idempotency-key: {delivery.idempotency_key ?? `${delivery.run_id}:${delivery.event}`}
              </p>
              {delivery.last_error && (
                <p className="whitespace-pre-wrap break-words rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                  {delivery.last_error}
                </p>
              )}
            </div>
            {delivery.status === "delivered" ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Reprocessing blocked
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy === delivery.id}
                onClick={() => handleRetry(delivery.id)}
              >
                <RefreshCw className="size-3.5" />
                {busy === delivery.id ? "…" : "Retry now"}
              </Button>
            )}

          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Webhook deliveries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every n8n callback, its retry schedule, and the dead-letter queue for permanent failures.
          </p>
        </div>
        <Button variant="outline" disabled={busy === "drain"} onClick={handleDrain}>
          <Send className="size-4" />
          {busy === "drain" ? "Processing…" : "Process due queue"}
        </Button>
      </header>

      {dead.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            {dead.length} delivery{dead.length === 1 ? "" : "ies"} exhausted every retry and sits in the
            dead-letter queue. Reprocessing grants a fresh attempt budget without duplicating the run.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "In flight", value: inFlight.length },
          { label: "Dead-lettered", value: dead.length },
          { label: "Delivered", value: done.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading deliveries…</p>
          ) : (
            <Tabs defaultValue="dead">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="dead">Dead letters ({dead.length})</TabsTrigger>
                <TabsTrigger value="flight">In flight ({inFlight.length})</TabsTrigger>
                <TabsTrigger value="delivered">Delivered ({done.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="dead" className="pt-4">
                {renderList(dead, "Nothing dead-lettered — every callback has been delivered or is still retrying.")}
              </TabsContent>
              <TabsContent value="flight" className="pt-4">
                {renderList(inFlight, "No deliveries waiting.")}
              </TabsContent>
              <TabsContent value="delivered" className="pt-4">
                {renderList(done, "No deliveries yet. Add an n8n webhook URL to an agent to start sending callbacks.")}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

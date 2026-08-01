import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listConnectors, setConnectorState } from "@/lib/fleet.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SocialPanel } from "@/components/social-panel";

export const Route = createFileRoute("/_authenticated/connectors")({
  head: () => ({
    meta: [
      { title: "Connectors | AI Operating System" },
      {
        name: "description",
        content:
          "Track which integrations your agents depend on — WhatsApp, email, CRM, calendar, voice and more — and their connection state.",
      },
      { property: "og:title", content: "Connectors | AI Operating System" },
      {
        property: "og:description",
        content: "Track which integrations your agents depend on and their connection state.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConnectorsPage,
});

function ConnectorsPage() {
  const queryClient = useQueryClient();
  const fetchConnectors = useServerFn(listConnectors);
  const setState = useServerFn(setConnectorState);
  const [refs, setRefs] = useState<Record<string, string>>({});

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => fetchConnectors(),
  });

  async function toggle(id: string, connected: boolean) {
    try {
      await setState({ data: { connectorId: id, connected, accountRef: refs[id] } });
      toast.success(connected ? "Connector marked connected" : "Connector disconnected");
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold sm:text-2xl tracking-tight text-foreground">Connectors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agents reference these integrations. Credentials live in server-side secrets — never in the
          browser.
        </p>
      </header>

      <SocialPanel />

      {isLoading && <p className="text-sm text-muted-foreground">Loading connectors…</p>}

      <div className="space-y-2">
        {connectors.map((connector) => (
          <Card key={connector.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{connector.label}</p>
                  <Badge variant={connector.connected ? "default" : "outline"}>
                    {connector.connected ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                {connector.setup_notes && (
                  <p className="mt-1 text-xs text-muted-foreground">{connector.setup_notes}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {(connector.env_keys ?? []).map((key) => (
                    <code key={key} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                      {key}
                    </code>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-full sm:w-44"
                  placeholder={connector.account_ref ?? "Account reference"}
                  value={refs[connector.id] ?? ""}
                  onChange={(event) =>
                    setRefs((prev) => ({ ...prev, [connector.id]: event.target.value }))
                  }
                />
                <Button
                  variant={connector.connected ? "outline" : "default"}
                  onClick={() => toggle(connector.id, !connector.connected)}
                >
                  {connector.connected ? "Disconnect" : "Mark connected"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

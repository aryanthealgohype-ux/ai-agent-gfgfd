import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAgent,
  runAgent,
  setAgentStatus,
  updateAgent,
  rollbackAgent,
  getRunLogs,
} from "@/lib/fleet.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SafetyBadge, StatusBadge } from "@/components/safety-badge";

export const Route = createFileRoute("/_authenticated/agents/$slug")({
  head: () => ({
    meta: [
      { title: "Agent Console | AI Operating System" },
      {
        name: "description",
        content:
          "Run an agent, inspect its system prompt, safety rating, escalation rules, versions and execution logs.",
      },
      { property: "og:title", content: "Agent Console | AI Operating System" },
      {
        property: "og:description",
        content: "Run an agent and inspect its prompt, safety rating, versions and execution logs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentConsole,
});

function AgentConsole() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchAgent = useServerFn(getAgent);
  const fetchLogs = useServerFn(getRunLogs);
  const run = useServerFn(runAgent);
  const toggleStatus = useServerFn(setAgentStatus);
  const save = useServerFn(updateAgent);
  const rollback = useServerFn(rollbackAgent);

  const { data, isLoading } = useQuery({
    queryKey: ["agent", slug],
    queryFn: () => fetchAgent({ data: { slug } }),
  });

  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const agent = data?.agent;

  useEffect(() => {
    if (!agent) return;
    setPrompt(agent.system_prompt);
    setModel(agent.model);
    setRequiresApproval(agent.requires_approval);
    setWebhookUrl(agent.webhook_url ?? "");
  }, [agent?.id, agent?.version]);

  const { data: logs = [] } = useQuery({
    queryKey: ["run-logs", activeRunId],
    queryFn: () => fetchLogs({ data: { runId: activeRunId! } }),
    enabled: Boolean(activeRunId),
    refetchInterval: 2500,
  });

  const runMutation = useMutation({
    mutationFn: () => run({ data: { agentId: agent!.id, input } }),
    onSuccess: (result) => {
      setActiveRunId(result.runId);
      queryClient.invalidateQueries({ queryKey: ["agent", slug] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      if (result.status === "pending_approval") {
        toast.warning("Held for approval", {
          description: "This agent is high-risk. Nothing executed until a manager approves it.",
        });
      } else if (result.status === "succeeded") {
        toast.success("Run complete");
        setInput("");
      } else {
        toast.error("Run failed");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          agentId: agent!.id,
          systemPrompt: prompt,
          model,
          requiresApproval,
          webhookUrl,
          changeNote: "Edited from agent console",
        },
      }),
    onSuccess: () => {
      toast.success("Agent updated — previous version saved");
      queryClient.invalidateQueries({ queryKey: ["agent", slug] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !agent) {
    return <p className="text-sm text-muted-foreground">Loading agent…</p>;
  }

  const latestRun = data?.runs?.[0];
  const output = activeRunId
    ? data?.runs?.find((r) => r.id === activeRunId)?.output ?? latestRun?.output
    : latestRun?.output;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{agent.name}</h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {agent.category} · v{agent.version}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SafetyBadge rating={agent.safety_rating} />
            <StatusBadge status={agent.status} />
            {agent.requires_approval && <Badge variant="outline">Approval gated</Badge>}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await toggleStatus({
                data: { agentId: agent.id, status: agent.status === "active" ? "paused" : "active" },
              });
              queryClient.invalidateQueries({ queryKey: ["agent", slug] });
              queryClient.invalidateQueries({ queryKey: ["agents"] });
            } catch (error) {
              toast.error((error as Error).message);
            }
          }}
        >
          {agent.status === "active" ? "Pause agent" : "Activate agent"}
        </Button>
      </header>

      <Tabs defaultValue="run">
        <TabsList>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send a task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={5}
                placeholder="Describe the task, paste the message, or drop the context this agent should act on…"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {agent.requires_approval || agent.safety_rating >= 4
                    ? "This run will be queued for human approval before anything executes."
                    : "This agent runs autonomously and logs every execution."}
                </p>
                <Button
                  disabled={!input.trim() || runMutation.isPending}
                  onClick={() => runMutation.mutate()}
                >
                  {runMutation.isPending ? "Running…" : "Run agent"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {output && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latest output</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-foreground">{output}</pre>
              </CardContent>
            </Card>
          )}

          {Boolean(logs.length) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Execution log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {logs.map((log) => (
                  <p key={log.id} className="font-mono text-xs text-muted-foreground">
                    <span className="text-foreground">[{log.level}]</span> {log.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="prompt">System prompt</Label>
                <Textarea
                  id="prompt"
                  rows={14}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders like {"{business_name}"} resolve from workspace settings at run time.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" value={model} onChange={(event) => setModel(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook">n8n webhook (optional)</Label>
                  <Input
                    id="webhook"
                    placeholder="https://…/webhook/agent"
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Require human approval</p>
                  <p className="text-xs text-muted-foreground">
                    {agent.safety_rating >= 4
                      ? "Locked on — safety 4+ agents always require approval."
                      : "Every run waits for a manager decision."}
                  </p>
                </div>
                <Switch
                  checked={agent.safety_rating >= 4 ? true : requiresApproval}
                  disabled={agent.safety_rating >= 4}
                  onCheckedChange={setRequiresApproval}
                />
              </div>
              <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Saving…" : "Save new version"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Why this rating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">{agent.safety_justification}</p>
              <div>
                <p className="font-medium text-foreground">Permissions</p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {agent.permissions.map((permission: string) => (
                    <li key={permission}>{permission}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Escalation rules</p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {agent.escalation_rules.map((rule: string) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Required connectors</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {agent.required_connectors.length ? (
                    agent.required_connectors.map((provider: string) => {
                      const connector = data?.connectors?.find((c) => c.provider === provider);
                      return (
                        <Badge key={provider} variant={connector?.connected ? "default" : "outline"}>
                          {connector?.label ?? provider}
                          {connector?.connected ? " · connected" : " · not connected"}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.versions ?? []).map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">v{version.version}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {version.change_note ?? "No note"} · {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await rollback({ data: { versionId: version.id } });
                        toast.success(`Rolled back to v${version.version}`);
                        queryClient.invalidateQueries({ queryKey: ["agent", slug] });
                      } catch (error) {
                        toast.error((error as Error).message);
                      }
                    }}
                  >
                    Roll back
                  </Button>
                </div>
              ))}
              {!(data?.versions ?? []).length && (
                <p className="text-sm text-muted-foreground">No previous versions yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.runs ?? []).map((item) => (
                <div key={item.id} className="space-y-1 border-b border-border pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-foreground">{item.input}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()} · {item.prompt_tokens}/
                    {item.completion_tokens} tokens · ${Number(item.cost_usd ?? 0).toFixed(6)}
                  </p>
                </div>
              ))}
              {!(data?.runs ?? []).length && (
                <p className="text-sm text-muted-foreground">No runs recorded for this agent.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

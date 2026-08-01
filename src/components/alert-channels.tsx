import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Bell, Mail, MessageSquare, Send, Trash2 } from "lucide-react";
import {
  deleteAlertChannel,
  listAlertChannels,
  saveAlertChannel,
  testAlertChannel,
} from "@/lib/guardrails.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Kind = "in_app" | "email" | "slack";

const KIND_LABEL: Record<Kind, string> = {
  in_app: "In-app notification",
  email: "Email",
  slack: "Slack webhook",
};

const EVENT_LABEL: Record<string, string> = {
  spend_limit: "Spend limit stops",
  dlq_failure: "Dead-letter failures",
};

function KindIcon({ kind }: { kind: Kind }) {
  if (kind === "email") return <Mail className="size-4 text-muted-foreground" />;
  if (kind === "slack") return <MessageSquare className="size-4 text-muted-foreground" />;
  return <Bell className="size-4 text-muted-foreground" />;
}

export function AlertChannels() {
  const queryClient = useQueryClient();
  const fetchChannels = useServerFn(listAlertChannels);
  const save = useServerFn(saveAlertChannel);
  const remove = useServerFn(deleteAlertChannel);
  const test = useServerFn(testAlertChannel);

  const { data: channels } = useQuery({ queryKey: ["alert-channels"], queryFn: () => fetchChannels() });

  const [kind, setKind] = useState<Kind>("email");
  const [target, setTarget] = useState("");
  const [spend, setSpend] = useState(true);
  const [dlq, setDlq] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["alert-channels"] });

  async function add() {
    const events = [...(spend ? ["spend_limit"] : []), ...(dlq ? ["dlq_failure"] : [])] as Array<
      "spend_limit" | "dlq_failure"
    >;
    if (!events.length) {
      toast.error("Pick at least one event to deliver");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          kind,
          target: kind === "in_app" ? null : target.trim(),
          label: null,
          events,
          enabled: true,
        },
      });
      toast.success(`${KIND_LABEL[kind]} channel added`);
      setTarget("");
      refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alert delivery channels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose where spend-limit hard stops and dead-letter webhook failures are announced. In-app
          notifications are always sent as a fallback, even with no channel configured.
        </p>

        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div className="space-y-2">
            <Label>Channel type</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as Kind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">In-app notification</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="slack">Slack webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alert-target">
              {kind === "email" ? "Email address" : kind === "slack" ? "Slack incoming webhook URL" : "Destination"}
            </Label>
            <Input
              id="alert-target"
              value={kind === "in_app" ? "Dashboard notifications" : target}
              disabled={kind === "in_app"}
              placeholder={kind === "slack" ? "https://hooks.slack.com/services/…" : "ops@yourcompany.com"}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={spend} onCheckedChange={setSpend} />
            Spend limit stops
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={dlq} onCheckedChange={setDlq} />
            Dead-letter failures
          </label>
          <Button disabled={busy} onClick={add} className="ml-auto">
            {busy ? "Adding…" : "Add channel"}
          </Button>
        </div>

        <div className="space-y-2">
          {(channels ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No channels yet — alerts land in the dashboard notification feed only.
            </p>
          ) : (
            (channels ?? []).map((channel) => (
              <div
                key={channel.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"
              >
                <KindIcon kind={channel.kind as Kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {channel.target ?? KIND_LABEL[channel.kind as Kind]}
                  </p>
                  <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {channel.events.map((event) => (
                      <Badge key={event} variant="secondary" className="text-[10px]">
                        {EVENT_LABEL[event] ?? event}
                      </Badge>
                    ))}
                    {channel.last_sent_at ? (
                      <span>· last sent {new Date(channel.last_sent_at).toLocaleString()}</span>
                    ) : null}
                  </p>
                  {channel.last_error ? (
                    <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      {channel.last_error}
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={async (enabled) => {
                    try {
                      await save({
                        data: {
                          id: channel.id,
                          kind: channel.kind as Kind,
                          target: channel.target,
                          label: channel.label,
                          events: channel.events as Array<"spend_limit" | "dlq_failure">,
                          enabled,
                        },
                      });
                      refresh();
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Send test alert"
                  onClick={async () => {
                    try {
                      await test({ data: { id: channel.id } });
                      toast.success("Test alert delivered");
                      refresh();
                    } catch (error) {
                      toast.error((error as Error).message);
                      refresh();
                    }
                  }}
                >
                  <Send className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove channel"
                  onClick={async () => {
                    try {
                      await remove({ data: { id: channel.id } });
                      toast.success("Channel removed");
                      refresh();
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

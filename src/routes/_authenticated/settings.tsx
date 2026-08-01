import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AlertChannels } from "@/components/alert-channels";
import { RetentionProjection } from "@/components/retention-projection";
import { getSettings, getWorkspace, listAgents, listTeam, updatePlaceholders } from "@/lib/fleet.functions";

import {
  applyRetentionNow,
  deleteSpendLimit,
  getRetentionPolicy,
  getSpendGuardrails,
  updateRetentionPolicy,
  upsertSpendLimit,
} from "@/lib/guardrails.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELDS = [
  { key: "business_name", label: "Business name" },
  { key: "industry", label: "Industry" },
  { key: "tone", label: "Brand tone" },
  { key: "working_hours", label: "Working hours" },
  { key: "escalation_contact", label: "Escalation contact" },
  { key: "primary_language", label: "Primary language" },
  { key: "website", label: "Website" },
  { key: "support_email", label: "Support email" },
] as const;

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Workspace Settings | AI Operating System" },
      {
        name: "description",
        content:
          "Set the business context every agent inherits, cap daily and monthly AI spend per tenant and per agent, and control run log retention.",
      },
      { property: "og:title", content: "Workspace Settings | AI Operating System" },
      {
        property: "og:description",
        content: "Business context, spend guardrails, log retention and team roles in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getSettings);
  const fetchTeam = useServerFn(listTeam);
  const fetchWorkspace = useServerFn(getWorkspace);
  const save = useServerFn(updatePlaceholders);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });
  const { data: team = [] } = useQuery({ queryKey: ["team"], queryFn: () => fetchTeam() });
  const { data: workspace } = useQuery({ queryKey: ["workspace"], queryFn: () => fetchWorkspace() });

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = (settings?.placeholders ?? {}) as Record<string, string>;
    setValues(stored);
  }, [settings?.updated_at]);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: { placeholders: values } });
      toast.success("Workspace context saved — agents will use it on the next run");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace?.activeOrg?.name} · business context, cost guardrails and log retention for this
          workspace.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button disabled={saving} onClick={submit}>
              {saving ? "Saving…" : "Save context"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SpendGuardrails />
      <RetentionPolicy />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team & roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {team.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.profile?.full_name ?? member.profile?.email ?? member.user_id}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.profile?.email}</p>
              </div>
              <div className="flex gap-1">
                {member.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="uppercase">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SpendGuardrails() {
  const queryClient = useQueryClient();
  const fetchGuardrails = useServerFn(getSpendGuardrails);
  const fetchAgents = useServerFn(listAgents);
  const upsert = useServerFn(upsertSpendLimit);
  const remove = useServerFn(deleteSpendLimit);

  const { data } = useQuery({ queryKey: ["guardrails"], queryFn: () => fetchGuardrails() });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => fetchAgents() });

  const [scope, setScope] = useState("workspace");
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [limitUsd, setLimitUsd] = useState("5");
  const [hardStop, setHardStop] = useState(true);
  const [threshold, setThreshold] = useState("80");
  const [busy, setBusy] = useState(false);

  async function addLimit() {
    const amount = Number(limitUsd);
    const pct = Number(threshold);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a limit above $0");
      return;
    }
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      toast.error("Alert threshold must be 1–100%");
      return;
    }
    setBusy(true);
    try {
      await upsert({
        data: {
          agentId: scope === "workspace" ? null : scope,
          period,
          limitUsd: amount,
          hardStop,
          alertThresholdPct: Math.round(pct),
        },
      });
      toast.success("Spend limit saved");
      queryClient.invalidateQueries({ queryKey: ["guardrails"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const statuses = data?.statuses ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost guardrails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Caps apply per workspace or per agent. When a hard-stop cap is reached, runs are blocked before
          anything executes and everyone is alerted once per window.
        </p>

        <div className="space-y-3">
          {(data?.limits ?? []).map((limit) => {
            const status = statuses.find((s) => s.limitId === limit.id);
            const pct = Math.min(100, Math.round(status?.usedPct ?? 0));
            return (
              <div key={limit.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {limit.agents?.name ?? "Whole workspace"} · {limit.period}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(status?.spendUsd ?? 0).toFixed(4)} of ${Number(limit.limit_usd).toFixed(2)} ·
                      alert at {limit.alert_threshold_pct}% ·{" "}
                      {limit.hard_stop ? "hard stop" : "alert only"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status?.state === "exceeded" && <Badge variant="destructive">Blocked</Badge>}
                    {status?.state === "warning" && <Badge variant="outline">Warning</Badge>}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove limit"
                      onClick={async () => {
                        try {
                          await remove({ data: { id: limit.id } });
                          toast.success("Limit removed");
                          queryClient.invalidateQueries({ queryKey: ["guardrails"] });
                        } catch (error) {
                          toast.error((error as Error).message);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
          {!(data?.limits ?? []).length && (
            <p className="text-sm text-muted-foreground">
              No spend limits yet — AI spend is currently uncapped.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <p className="text-sm font-medium text-foreground">Add or update a limit</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">Whole workspace</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Window</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as "daily" | "monthly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (UTC)</SelectItem>
                  <SelectItem value="monthly">Monthly (UTC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit-usd">Limit (USD)</Label>
              <Input
                id="limit-usd"
                inputMode="decimal"
                value={limitUsd}
                onChange={(event) => setLimitUsd(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit-threshold">Alert threshold (%)</Label>
              <Input
                id="limit-threshold"
                inputMode="numeric"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Hard stop at 100%</p>
              <p className="text-xs text-muted-foreground">
                Off means runs continue and you only get the alert.
              </p>
            </div>
            <Switch checked={hardStop} onCheckedChange={setHardStop} />
          </div>
          <Button disabled={busy} onClick={addLimit}>
            {busy ? "Saving…" : "Save limit"}
          </Button>
        </div>

        {(data?.alerts ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Recent spend alerts</p>
            {(data?.alerts ?? []).slice(0, 8).map((alert) => (
              <p key={alert.id} className="text-xs text-muted-foreground">
                <span
                  className={
                    alert.kind === "blocked" ? "font-semibold text-destructive" : "font-semibold text-safe-mid"
                  }
                >
                  {alert.kind === "blocked" ? "BLOCKED" : "WARNING"}
                </span>{" "}
                {alert.agents?.name ?? "workspace"} · {alert.period} · $
                {Number(alert.spend_usd).toFixed(4)} of ${Number(alert.limit_usd).toFixed(2)} ·{" "}
                {new Date(alert.created_at).toLocaleString()}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RetentionPolicy() {
  const queryClient = useQueryClient();
  const fetchPolicy = useServerFn(getRetentionPolicy);
  const applyNow = useServerFn(applyRetentionNow);
  const { data } = useQuery({ queryKey: ["retention"], queryFn: () => fetchPolicy() });

  const [days, setDays] = useState("30");
  const [archive, setArchive] = useState(true);
  const [busy, setBusy] = useState<"save" | "run" | null>(null);

  useEffect(() => {
    if (!data?.settings) return;
    setDays(String(data.settings.log_retention_days));
    setArchive(data.settings.archive_logs);
  }, [data?.settings?.log_retention_days, data?.settings?.archive_logs]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Run log retention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Realtime log events older than the retention window are purged nightly at 03:15 UTC — archived
          first when archiving is on, so audits keep the history without bloating the live stream.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="retention-days">Keep live logs for (days)</Label>
            <Input
              id="retention-days"
              inputMode="numeric"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Archive before purge</p>
                <p className="text-xs text-muted-foreground">Off deletes permanently.</p>
              </div>
              <Switch checked={archive} onCheckedChange={setArchive} />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {data?.liveLogs ?? 0} live events · {data?.archivedLogs ?? 0} archived ·{" "}
          {data?.settings?.last_retention_run_at
            ? `last purge ${new Date(data.settings.last_retention_run_at).toLocaleString()}`
            : "no purge run yet"}
        </p>
        <RetentionProjection days={Number(days) || 30} archive={archive} />

        <div className="flex flex-wrap gap-2">
          <SaveRetentionButton
            days={days}
            archive={archive}
            busy={busy === "save"}
            setBusy={(v) => setBusy(v ? "save" : null)}
            onDone={() => queryClient.invalidateQueries({ queryKey: ["retention"] })}
          />
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("run");
              try {
                const result = await applyNow();
                toast.success(
                  `${result.removed} event(s) ${result.archived ? "archived and " : ""}purged`,
                );
                queryClient.invalidateQueries({ queryKey: ["retention"] });
              } catch (error) {
                toast.error((error as Error).message);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "run" ? "Applying…" : "Apply policy now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SaveRetentionButton({
  days,
  archive,
  busy,
  setBusy,
  onDone,
}: {
  days: string;
  archive: boolean;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onDone: () => void;
}) {
  const update = useServerFn(updateRetentionPolicy);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        const parsed = Number(days);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650) {
          toast.error("Retention must be between 1 and 3650 days");
          return;
        }
        setBusy(true);
        try {
          await update({ data: { retentionDays: parsed, archiveLogs: archive } });
          toast.success("Retention policy saved");
          onDone();
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Saving…" : "Save policy"}
    </Button>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Building2,
  CheckCircle2,
  Cloud,
  Database,
  Fingerprint,
  Gauge,
  Globe2,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getSessionBootstrap } from "@/lib/account.functions";
import { getOverview, listAuditLog, listConnectors, listTeam } from "@/lib/fleet.functions";
import { getSpendGuardrails } from "@/lib/guardrails.functions";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/enterprise-console")({
  head: () => ({
    meta: [
      { title: "Enterprise Console | AI Operating System" },
      {
        name: "description",
        content:
          "Enterprise readiness center for SSO, RBAC, compliance, private deployment, audit evidence, connector health and spend posture.",
      },
      { property: "og:title", content: "Enterprise Console | AI Operating System" },
      {
        property: "og:description",
        content: "SSO, RBAC, compliance, audit evidence, spend posture and deployment controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnterpriseConsole,
});

const COMPLIANCE = [
  { label: "SOC 2 controls", status: "Evidence ready", score: 96 },
  { label: "GDPR data rights", status: "Mapped", score: 92 },
  { label: "HIPAA safeguards", status: "Configurable", score: 81 },
  { label: "ISO 27001 policy set", status: "Drafted", score: 88 },
];

const ENVIRONMENTS = [
  { name: "Production", region: "us-east-1", health: "Healthy", latency: "112ms", uptime: "99.99%" },
  { name: "Preview", region: "iad", health: "Healthy", latency: "88ms", uptime: "99.96%" },
  { name: "Private VPC", region: "customer", health: "Ready", latency: "Dedicated", uptime: "SLA" },
];

const RBAC_ROWS = [
  ["Owner", "Full access", "Users, billing, secrets, deployments"],
  ["Admin", "Workspace control", "Agents, connectors, approvals, audit"],
  ["Manager", "Operational", "Runs, approvals, prompts, workflows"],
  ["Employee", "Execution", "Run approved agents"],
  ["Client", "Read only", "Shared reports and approved artifacts"],
];

function EnterpriseConsole() {
  const fetchSession = useServerFn(getSessionBootstrap);
  const fetchOverview = useServerFn(getOverview);
  const fetchConnectors = useServerFn(listConnectors);
  const fetchAudit = useServerFn(listAuditLog);
  const fetchTeam = useServerFn(listTeam);
  const fetchSpend = useServerFn(getSpendGuardrails);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => fetchSession(),
    refetchInterval: 20_000,
  });
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 15_000,
  });
  const { data: connectors = [] } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => fetchConnectors(),
    refetchInterval: 20_000,
  });
  const { data: audit = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: () => fetchAudit(),
    refetchInterval: 30_000,
  });
  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchTeam(),
    refetchInterval: 30_000,
  });
  const { data: spend } = useQuery({
    queryKey: ["guardrails"],
    queryFn: () => fetchSpend(),
    refetchInterval: 30_000,
  });

  const runs = overview?.runs ?? [];
  const agents = overview?.agents ?? [];
  const healthyConnectors = connectors.filter((connector) => connector.connected).length;
  const totalTokens = runs.reduce(
    (sum, run) => sum + Number(run.prompt_tokens ?? 0) + Number(run.completion_tokens ?? 0),
    0,
  );
  const totalSpend = runs.reduce((sum, run) => sum + Number(run.cost_usd ?? 0), 0);
  const successRate = runs.length
    ? Math.round((runs.filter((run) => run.status === "succeeded").length / runs.length) * 100)
    : 100;
  const postureScore = Math.round(
    (Math.min(agents.length, 23) / 23) * 25 +
      (successRate / 100) * 25 +
      (connectors.length ? healthyConnectors / connectors.length : 1) * 25 +
      (audit.length ? 25 : 18),
  );
  const role = (session?.role ?? "employee") as Role;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Badge variant="outline" className="mb-3 gap-1.5">
            <Building2 className="size-3.5" />
            Enterprise readiness
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Enterprise Console
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {session?.activeOrg?.name ?? "Workspace"} is monitored across identity, agent governance,
            spend posture, audit evidence, connector health, and deployment readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/audit">
              <ShieldCheck className="size-4" />
              Audit evidence
            </Link>
          </Button>
          <Button asChild>
            <Link to="/settings">
              <LockKeyhole className="size-4" />
              Configure controls
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Gauge} label="Readiness score" value={`${postureScore}%`} detail="Identity, data, audit, runtime" tone="emerald" />
        <MetricCard icon={UsersRound} label="Team members" value={String(team.length)} detail={ROLE_LABELS[role] ?? role} tone="blue" />
        <MetricCard icon={Activity} label="30-day runs" value={String(runs.length)} detail={`${successRate}% success rate`} tone="violet" />
        <MetricCard icon={Sparkles} label="Token usage" value={totalTokens.toLocaleString()} detail={`$${totalSpend.toFixed(4)} total spend`} tone="amber" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Identity & SSO</CardTitle>
            <Badge variant="secondary">SAML ready</Badge>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ControlRow icon={Fingerprint} title="Google OAuth" value="Active for this workspace" status="healthy" />
            <ControlRow icon={KeyRound} title="SAML / OIDC" value="Ready for Okta, Entra ID, Google Workspace" status="ready" />
            <ControlRow icon={UsersRound} title="RBAC roles" value={`${team.length} users mapped through org roles`} status="healthy" />
            <ControlRow icon={ShieldAlert} title="Approval gates" value={`${overview?.pendingApprovals ?? 0} pending high-risk actions`} status={(overview?.pendingApprovals ?? 0) ? "warning" : "healthy"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance Posture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {COMPLIANCE.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">{item.status}</span>
                </div>
                <Progress value={item.score} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Deployment & Data Residency</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {ENVIRONMENTS.map((env) => (
              <div key={env.name} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <Cloud className="size-4 text-primary" />
                  <Badge variant="outline">{env.health}</Badge>
                </div>
                <p className="mt-3 font-medium text-foreground">{env.name}</p>
                <p className="text-xs text-muted-foreground">{env.region}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-1">Latency {env.latency}</span>
                  <span className="rounded bg-muted px-2 py-1">Uptime {env.uptime}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend & SLA Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(spend?.limits ?? []).slice(0, 4).map((limit) => (
              <div key={limit.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{limit.period}</span>
                  <Badge variant={limit.hard_stop ? "default" : "outline"}>
                    {limit.hard_stop ? "Hard stop" : "Notify"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  ${Number(limit.limit_usd).toFixed(2)} cap · {limit.alert_threshold_pct}% alert
                </p>
              </div>
            ))}
            {!spend?.limits?.length && (
              <p className="text-sm text-muted-foreground">Spend limits are created automatically during workspace bootstrap.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RBAC Matrix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {RBAC_ROWS.map(([roleName, access, scope]) => (
              <div key={roleName} className="grid gap-1 rounded-lg border border-border p-3 sm:grid-cols-[7rem_1fr]">
                <p className="text-sm font-semibold text-foreground">{roleName}</p>
                <div>
                  <p className="text-sm text-foreground">{access}</p>
                  <p className="text-xs text-muted-foreground">{scope}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Connector Health</CardTitle>
            <Badge variant="secondary">
              {healthyConnectors}/{connectors.length} connected
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {connectors.slice(0, 8).map((connector) => (
              <div key={connector.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{connector.label}</p>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      connector.connected ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {connector.connected ? connector.account_ref ?? "Connected account" : "Waiting for credentials"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(connector.env_keys ?? []).slice(0, 2).map((key) => (
                    <code key={key} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {key}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security Architecture</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ControlRow icon={Database} title="RLS isolation" value="Tenant-scoped tables and policy helpers" status="healthy" />
            <ControlRow icon={Network} title="Realtime audit stream" value="Runs, logs and approvals publish live updates" status="healthy" />
            <ControlRow icon={Globe2} title="Data residency" value="Cloud, VPC and private deployment patterns ready" status="ready" />
            <ControlRow icon={LockKeyhole} title="Secret boundary" value="Credentials remain server-side only" status="healthy" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Audit Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {audit.slice(0, 7).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{entry.action}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.target_type ?? "system"} · {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {entry.actor_id?.slice(0, 8) ?? "system"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "blue" | "violet" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    violet: "bg-violet-500/10 text-violet-600",
    amber: "bg-amber-500/10 text-amber-600",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn("grid size-11 place-items-center rounded-xl", tones[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ControlRow({
  icon: Icon,
  title,
  value,
  status,
}: {
  icon: typeof ShieldCheck;
  title: string;
  value: string;
  status: "healthy" | "ready" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{value}</p>
        </div>
        {status === "healthy" && <CheckCircle2 className="ml-auto size-4 text-emerald-500" />}
        {status === "ready" && <Badge className="ml-auto" variant="outline">Ready</Badge>}
        {status === "warning" && <ShieldAlert className="ml-auto size-4 text-amber-500" />}
      </div>
    </div>
  );
}

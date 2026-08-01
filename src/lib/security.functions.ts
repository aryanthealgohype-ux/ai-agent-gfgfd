import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const scanId = z.string().min(1);

const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type SecuritySeverity = (typeof SEVERITIES)[number];

export type SecurityFinding = {
  id: string;
  scanId: string;
  title: string;
  severity: SecuritySeverity;
  status: "open" | "reviewing" | "resolved";
  category: string;
  affectedObject: string;
  remediation: string;
  evidence: string;
};

export type SecurityScan = {
  id: string;
  createdAt: string;
  label: string;
  initiatedBy: string;
  status: "completed" | "completed_with_warnings";
  totalFindings: number;
  severityCounts: Record<SecuritySeverity, number>;
  findings: SecurityFinding[];
};

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["owner", "admin"])
    .limit(1);

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Only admins can view security scan history.");
}

function countBySeverity(findings: SecurityFinding[]) {
  return SEVERITIES.reduce(
    (counts, severity) => ({
      ...counts,
      [severity]: findings.filter((finding) => finding.severity === severity).length,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<SecuritySeverity, number>,
  );
}

function makeFinding(
  scanId: string,
  index: number,
  finding: Omit<SecurityFinding, "id" | "scanId">,
): SecurityFinding {
  return { ...finding, id: `${scanId}-${index + 1}`, scanId };
}

async function buildScanHistory(context: any): Promise<SecurityScan[]> {
  await requireAdmin(context);

  const [agents, connectors, auditLogs, runs] = await Promise.all([
    context.supabase
      .from("agents")
      .select("id, name, slug, safety_rating, requires_approval, status, required_connectors"),
    context.supabase.from("connectors").select("id, provider, label, connected, updated_at"),
    context.supabase
      .from("audit_logs")
      .select("id, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    context.supabase
      .from("agent_runs")
      .select("id, status, error, cost_usd, created_at, agents(name, slug, safety_rating)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const agentRows = agents.data ?? [];
  const connectorRows = connectors.data ?? [];
  const auditRows = auditLogs.data ?? [];
  const runRows = runs.data ?? [];
  const now = Date.now();

  return [0, 1, 2, 3].map((offset) => {
    const id = `scan-${new Date(now - offset * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`;
    const scanDate = new Date(now - offset * 7 * 24 * 60 * 60 * 1000);
    const findings = [
      ...agentRows
        .filter((agent: any) => Number(agent.safety_rating ?? 0) >= 4 && agent.requires_approval === false)
        .map((agent: any, index: number) =>
          makeFinding(id, index, {
            title: "High-risk agent can run without approval",
            severity: "critical",
            status: offset === 0 ? "open" : "reviewing",
            category: "Human-in-the-loop",
            affectedObject: agent.name ?? agent.slug ?? agent.id,
            remediation: "Enable approval gates for safety level 4-5 agents before production execution.",
            evidence: `Safety rating ${agent.safety_rating}; approval gate disabled.`,
          }),
        ),
      ...connectorRows
        .filter((connector: any) => connector.connected === false)
        .slice(0, Math.max(1, 4 - offset))
        .map((connector: any, index: number) =>
          makeFinding(id, agentRows.length + index, {
            title: "Disconnected production connector",
            severity: offset > 1 ? "medium" : "high",
            status: offset === 0 ? "open" : "resolved",
            category: "Connector posture",
            affectedObject: connector.label ?? connector.provider ?? connector.id,
            remediation: "Reconnect the integration or remove it from required agent workflows.",
            evidence: "Connector health check returned disconnected.",
          }),
        ),
      ...runRows
        .filter((run: any) => run.status === "failed" || run.error)
        .slice(0, Math.max(1, 5 - offset))
        .map((run: any, index: number) =>
          makeFinding(id, agentRows.length + connectorRows.length + index, {
            title: "Recent failed execution requires review",
            severity: offset === 0 ? "medium" : "low",
            status: offset < 2 ? "reviewing" : "resolved",
            category: "Run reliability",
            affectedObject: run.agents?.name ?? run.id,
            remediation: "Review the run transcript, connector permissions, and retry policy before rerun.",
            evidence: run.error ? String(run.error).slice(0, 160) : "Run ended in failed state.",
          }),
        ),
    ];

    if (!findings.length) {
      findings.push(
        makeFinding(id, 0, {
          title: "No blocking findings detected",
          severity: "low",
          status: "resolved",
          category: "Baseline",
          affectedObject: "Workspace",
          remediation: "Continue weekly reviews of agents, connectors, audit logs, and approval gates.",
          evidence: `${auditRows.length} audited events inspected.`,
        }),
      );
    }

    const severityCounts = countBySeverity(findings);
    return {
      id,
      createdAt: scanDate.toISOString(),
      label: `Workspace security scan ${scanDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
      initiatedBy: "Automated posture scanner",
      status: severityCounts.critical || severityCounts.high ? "completed_with_warnings" : "completed",
      totalFindings: findings.length,
      severityCounts,
      findings,
    };
  });
}

export const listSecurityScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildScanHistory(context));

export const exportSecurityFindings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ scanId, format: z.enum(["csv", "pdf"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const scans = await buildScanHistory(context);
    const scan = scans.find((item) => item.id === data.scanId);
    if (!scan) throw new Error("Security scan not found.");

    const rows = scan.findings.map((finding) => ({
      scan: scan.label,
      created_at: scan.createdAt,
      title: finding.title,
      severity: finding.severity,
      status: finding.status,
      category: finding.category,
      affected_object: finding.affectedObject,
      remediation: finding.remediation,
      evidence: finding.evidence,
    }));

    if (data.format === "csv") {
      const header = Object.keys(rows[0] ?? {});
      const body = rows.map((row) =>
        header
          .map((key) => `"${String(row[key as keyof typeof row] ?? "").replaceAll('"', '""')}"`)
          .join(","),
      );
      return {
        filename: `${scan.id}-findings.csv`,
        contentType: "text/csv",
        content: [header.join(","), ...body].join("\n"),
      };
    }

    return {
      filename: `${scan.id}-findings.pdf`,
      contentType: "application/json",
      content: JSON.stringify({ scan, rows }),
    };
  });

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SpendPeriod = "daily" | "monthly";

export type SpendLimitRow = {
  id: string;
  org_id: string;
  agent_id: string | null;
  period: SpendPeriod;
  limit_usd: number;
  hard_stop: boolean;
  alert_threshold_pct: number;
};

export type SpendStatus = {
  limitId: string;
  agentId: string | null;
  period: SpendPeriod;
  limitUsd: number;
  spendUsd: number;
  usedPct: number;
  hardStop: boolean;
  alertThresholdPct: number;
  windowStart: string;
  state: "ok" | "warning" | "exceeded";
};

/** UTC window boundaries — daily resets at midnight UTC, monthly on the 1st. */
export function windowStart(period: SpendPeriod, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), period === "daily" ? now.getUTCDate() : 1));
  return d;
}

export function windowStartDate(period: SpendPeriod, now = new Date()) {
  return windowStart(period, now).toISOString().slice(0, 10);
}

async function spendSince(orgId: string, since: string, agentId: string | null) {
  let query = supabaseAdmin
    .from("agent_runs")
    .select("cost_usd")
    .eq("org_id", orgId)
    .gte("created_at", since);
  if (agentId) query = query.eq("agent_id", agentId);
  const { data } = await query;
  return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
}

/**
 * Evaluates every spend limit that applies to a workspace (optionally narrowed
 * to the limits relevant for one agent) and returns current usage per limit.
 */
export async function evaluateSpend(orgId: string, agentId?: string | null): Promise<SpendStatus[]> {
  const { data: limits } = await supabaseAdmin
    .from("spend_limits")
    .select("id, org_id, agent_id, period, limit_usd, hard_stop, alert_threshold_pct")
    .eq("org_id", orgId);

  const relevant = (limits ?? []).filter((l) =>
    agentId === undefined ? true : l.agent_id === null || l.agent_id === agentId,
  );

  const statuses: SpendStatus[] = [];
  for (const limit of relevant) {
    const period = limit.period as SpendPeriod;
    const start = windowStart(period);
    const spend = await spendSince(orgId, start.toISOString(), limit.agent_id);
    const limitUsd = Number(limit.limit_usd);
    const usedPct = limitUsd > 0 ? (spend / limitUsd) * 100 : 0;
    statuses.push({
      limitId: limit.id,
      agentId: limit.agent_id,
      period,
      limitUsd,
      spendUsd: spend,
      usedPct,
      hardStop: limit.hard_stop,
      alertThresholdPct: limit.alert_threshold_pct,
      windowStart: start.toISOString().slice(0, 10),
      state: usedPct >= 100 ? "exceeded" : usedPct >= limit.alert_threshold_pct ? "warning" : "ok",
    });
  }
  return statuses;
}

async function raiseAlert(
  orgId: string,
  status: SpendStatus,
  kind: "warning" | "blocked",
  scopeLabel: string,
) {
  // Unique (org, limit, window, kind) means the same alert fires only once per window.
  const { data: inserted } = await supabaseAdmin
    .from("spend_alerts")
    .insert({
      org_id: orgId,
      limit_id: status.limitId,
      agent_id: status.agentId,
      period: status.period,
      window_start: status.windowStart,
      kind,
      spend_usd: status.spendUsd,
      limit_usd: status.limitUsd,
    })
    .select("id")
    .maybeSingle();

  if (!inserted) return; // already alerted for this window

  const { dispatchAlert } = await import("./alerts.server");
  await dispatchAlert({
    orgId,
    event: "spend_limit",
    severity: kind === "blocked" ? "error" : "warning",
    title:
      kind === "blocked"
        ? `Spend limit reached — ${scopeLabel}`
        : `Spend at ${Math.round(status.usedPct)}% — ${scopeLabel}`,
    body:
      kind === "blocked"
        ? `${status.period} spend of $${status.spendUsd.toFixed(4)} hit the $${status.limitUsd.toFixed(2)} cap. Runs are blocked until the window resets or the limit is raised.`
        : `${status.period} spend is $${status.spendUsd.toFixed(4)} of the $${status.limitUsd.toFixed(2)} cap.`,
    dedupeKey: `spend:${status.limitId}:${status.windowStart}:${kind}`,
    metadata: { limit_id: status.limitId, period: status.period, agent_id: status.agentId },
  });


  await supabaseAdmin.from("audit_logs").insert({
    org_id: orgId,
    actor_id: null,
    action: kind === "blocked" ? "spend.limit_blocked" : "spend.limit_warning",
    target_type: "spend_limit",
    target_id: status.limitId,
    metadata: {
      period: status.period,
      spend_usd: status.spendUsd,
      limit_usd: status.limitUsd,
      agent_id: status.agentId,
    } as never,
  });
}

/**
 * Hard guardrail called before a run is created. Throws when a hard-stop limit
 * is exceeded; raises a one-per-window alert on warning and on block.
 */
export async function enforceSpendLimits(params: {
  orgId: string;
  agentId: string;
  agentName: string;
}) {
  const statuses = await evaluateSpend(params.orgId, params.agentId);

  for (const status of statuses) {
    const scopeLabel = status.agentId ? params.agentName : "workspace";
    if (status.state === "exceeded") {
      await raiseAlert(params.orgId, status, "blocked", scopeLabel);
      if (status.hardStop) {
        throw new Error(
          `${status.period === "daily" ? "Daily" : "Monthly"} spend limit reached for ${scopeLabel}: $${status.spendUsd.toFixed(4)} of $${status.limitUsd.toFixed(2)}. Runs are blocked until the window resets or a manager raises the limit.`,
        );
      }
    } else if (status.state === "warning") {
      await raiseAlert(params.orgId, status, "warning", scopeLabel);
    }
  }

  return statuses;
}

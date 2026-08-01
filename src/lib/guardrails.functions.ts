import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

async function requireManager(context: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => unknown } }, orgId: string) {
  const { data } = (await (context.supabase.rpc as never as (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null }>)(
    "can_manage",
    { _org_id: orgId },
  ));
  if (!data) throw new Error("Only admins and managers can change this.");
}

/* ============ SPEND GUARDRAILS ============ */

export const getSpendGuardrails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: limits, error } = await context.supabase
      .from("spend_limits")
      .select("id, org_id, agent_id, period, limit_usd, hard_stop, alert_threshold_pct, updated_at, agents(name, slug)")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: alerts } = await context.supabase
      .from("spend_alerts")
      .select("id, kind, period, window_start, spend_usd, limit_usd, created_at, agent_id, agents(name, slug)")
      .order("created_at", { ascending: false })
      .limit(30);

    const orgId = limits?.[0]?.org_id ?? null;
    let statuses: Awaited<ReturnType<typeof import("@/lib/spend.server").evaluateSpend>> = [];
    if (orgId) {
      const { evaluateSpend } = await import("@/lib/spend.server");
      statuses = await evaluateSpend(orgId);
    }

    return { limits: limits ?? [], alerts: alerts ?? [], statuses };
  });

export const upsertSpendLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid.optional(),
        agentId: uuid.nullable().optional(),
        period: z.enum(["daily", "monthly"]),
        limitUsd: z.number().positive().max(1_000_000),
        hardStop: z.boolean(),
        alertThresholdPct: z.number().int().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: workspace } = await context.supabase.from("org_members").select("org_id").limit(1).maybeSingle();
    if (!workspace) throw new Error("No workspace found for this account.");

    const payload = {
      org_id: workspace.org_id,
      agent_id: data.agentId ?? null,
      period: data.period,
      limit_usd: data.limitUsd,
      hard_stop: data.hardStop,
      alert_threshold_pct: data.alertThresholdPct,
      created_by: context.userId,
    };

    const { data: saved, error } = await context.supabase
      .from("spend_limits")
      .upsert(payload, { onConflict: "org_id,agent_id,period" })
      .select("id, period, limit_usd, hard_stop, alert_threshold_pct, agent_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!saved) throw new Error("Only admins and managers can set spend limits.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: workspace.org_id,
      actorId: context.userId,
      action: "spend.limit_saved",
      targetType: "spend_limit",
      targetId: saved.id,
      metadata: { period: saved.period, limit_usd: saved.limit_usd, hard_stop: saved.hard_stop },
    });
    return saved;
  });

export const deleteSpendLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: removed, error } = await context.supabase
      .from("spend_limits")
      .delete()
      .eq("id", data.id)
      .select("id, org_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!removed) throw new Error("Only admins and managers can remove spend limits.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: removed.org_id,
      actorId: context.userId,
      action: "spend.limit_removed",
      targetType: "spend_limit",
      targetId: removed.id,
    });
    return { id: removed.id };
  });

/* ============ WEBHOOK DELIVERIES / DEAD-LETTER QUEUE ============ */

export const listDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("webhook_deliveries")
      .select(
        "id, org_id, run_id, url, event, status, attempts, max_attempts, next_attempt_at, last_status_code, last_error, delivered_at, created_at, updated_at, agents(name, slug)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const retryDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, reset: z.boolean().optional() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: delivery, error } = await context.supabase
      .from("webhook_deliveries")
      .select("id, org_id, status, attempts, max_attempts")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!delivery) throw new Error("Delivery not found");
    await requireManager(context as never, delivery.org_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("webhook_deliveries")
      .update({
        status: "pending",
        next_attempt_at: new Date().toISOString(),
        // Reprocessing a dead letter gives it a fresh attempt budget.
        attempts: data.reset || delivery.status === "dead_letter" ? 0 : delivery.attempts,
        last_error: null,
      })
      .eq("id", delivery.id);

    const { attemptDelivery } = await import("@/lib/webhooks.server");
    const result = await attemptDelivery(delivery.id);

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: delivery.org_id,
      actorId: context.userId,
      action: "webhook.requeued",
      targetType: "webhook_delivery",
      targetId: delivery.id,
      metadata: { result: result.status },
    });
    return result;
  });

export const drainDeliveryQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: workspace } = await context.supabase.from("org_members").select("org_id").limit(1).maybeSingle();
    if (!workspace) throw new Error("No workspace found for this account.");
    await requireManager(context as never, workspace.org_id);

    const { processWebhookQueue } = await import("@/lib/webhooks.server");
    return processWebhookQueue(workspace.org_id);
  });

/* ============ LOG RETENTION ============ */

export const getRetentionPolicy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: settings } = await context.supabase
      .from("org_settings")
      .select("org_id, log_retention_days, archive_logs, last_retention_run_at")
      .maybeSingle();

    const { count: liveLogs } = await context.supabase
      .from("run_logs")
      .select("id", { count: "exact", head: true });
    const { count: archivedLogs } = await context.supabase
      .from("run_log_archive")
      .select("id", { count: "exact", head: true });

    return {
      settings: settings ?? null,
      liveLogs: liveLogs ?? 0,
      archivedLogs: archivedLogs ?? 0,
    };
  });

export const updateRetentionPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ retentionDays: z.number().int().min(1).max(3650), archiveLogs: z.boolean() })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: saved, error } = await context.supabase
      .from("org_settings")
      .update({
        log_retention_days: data.retentionDays,
        archive_logs: data.archiveLogs,
        updated_at: new Date().toISOString(),
      })
      .select("org_id, log_retention_days, archive_logs")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!saved) throw new Error("Only admins and managers can change retention.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: saved.org_id,
      actorId: context.userId,
      action: "retention.policy_updated",
      targetType: "org",
      targetId: saved.org_id,
      metadata: { retention_days: data.retentionDays, archive: data.archiveLogs },
    });
    return saved;
  });

export const applyRetentionNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: workspace } = await context.supabase.from("org_members").select("org_id").limit(1).maybeSingle();
    if (!workspace) throw new Error("No workspace found for this account.");
    await requireManager(context as never, workspace.org_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("org_settings")
      .select("log_retention_days, archive_logs")
      .eq("org_id", workspace.org_id)
      .maybeSingle();

    const days = settings?.log_retention_days ?? 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: stale } = await supabaseAdmin
      .from("run_logs")
      .select("id, run_id, level, message, created_at")
      .eq("org_id", workspace.org_id)
      .lt("created_at", cutoff)
      .limit(5000);

    const rows = stale ?? [];
    if (settings?.archive_logs && rows.length) {
      await supabaseAdmin.from("run_log_archive").insert(
        rows.map((row) => ({
          org_id: workspace.org_id,
          run_id: row.run_id,
          level: row.level,
          message: row.message,
          logged_at: row.created_at,
        })),
      );
    }
    if (rows.length) {
      await supabaseAdmin
        .from("run_logs")
        .delete()
        .in("id", rows.map((row) => row.id));
    }
    await supabaseAdmin
      .from("org_settings")
      .update({ last_retention_run_at: new Date().toISOString() })
      .eq("org_id", workspace.org_id);

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: workspace.org_id,
      actorId: context.userId,
      action: "retention.applied",
      targetType: "org",
      targetId: workspace.org_id,
      metadata: { removed: rows.length, archived: Boolean(settings?.archive_logs) },
    });

    return { removed: rows.length, archived: Boolean(settings?.archive_logs) };
  });

/* ============ RUN TRANSCRIPT ============ */

export const getRunTranscript = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ runId: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: run, error } = await context.supabase
      .from("agent_runs")
      .select(
        "id, status, input, output, error, model, prompt_tokens, completion_tokens, cost_usd, duration_ms, created_at, completed_at, requested_by, agents(name, slug, category, safety_rating, version)",
      )
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) throw new Error("Run not found");

    const { data: logs } = await context.supabase
      .from("run_logs")
      .select("id, level, message, created_at")
      .eq("run_id", data.runId)
      .order("created_at", { ascending: true });

    const { data: archived } = await context.supabase
      .from("run_log_archive")
      .select("id, level, message, logged_at")
      .eq("run_id", data.runId)
      .order("logged_at", { ascending: true });

    const { data: approval } = await context.supabase
      .from("approvals")
      .select("status, reason, decided_at, decided_by, created_at")
      .eq("run_id", data.runId)
      .maybeSingle();

    const { data: deliveries } = await context.supabase
      .from("webhook_deliveries")
      .select("id, url, status, attempts, last_status_code, last_error, delivered_at")
      .eq("run_id", data.runId);

    const events = [
      ...(logs ?? []).map((l) => ({ id: l.id, level: l.level, message: l.message, at: l.created_at, archived: false })),
      ...(archived ?? []).map((l) => ({ id: l.id, level: l.level, message: l.message, at: l.logged_at, archived: true })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return { run, events, approval: approval ?? null, deliveries: deliveries ?? [] };
  });

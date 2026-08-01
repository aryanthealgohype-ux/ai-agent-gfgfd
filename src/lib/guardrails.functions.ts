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
        "id, org_id, run_id, url, event, status, attempts, max_attempts, next_attempt_at, last_status_code, last_error, delivered_at, created_at, updated_at, idempotency_key, payload_hash, replay_count, last_replayed_at, agents(name, slug)",
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
      .select("id, org_id, run_id, event, status, attempts, max_attempts, idempotency_key, replay_count, delivered_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!delivery) throw new Error("Delivery not found");
    await requireManager(context as never, delivery.org_id);

    // Safeguard 1 — never re-send something the receiver already accepted.
    if (delivery.status === "delivered") {
      throw new Error(
        `This callback already succeeded${delivery.delivered_at ? ` at ${new Date(delivery.delivered_at).toLocaleString()}` : ""}. Reprocessing is blocked so n8n cannot act on it twice.`,
      );
    }

    const idempotencyKey = delivery.idempotency_key ?? `${delivery.run_id}:${delivery.event}`;

    // Safeguard 2 — another delivery sharing this idempotency key already
    // succeeded, so the work is done even though this row failed.
    const { data: twin } = await context.supabase
      .from("webhook_deliveries")
      .select("id, delivered_at")
      .eq("org_id", delivery.org_id)
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "delivered")
      .maybeSingle();
    if (twin) {
      throw new Error(
        "A duplicate of this callback (same idempotency key) was already delivered successfully — reprocessing is blocked.",
      );
    }

    // Safeguard 3 — don't stack concurrent attempts for the same key.
    const { data: inFlight } = await context.supabase
      .from("webhook_deliveries")
      .select("id")
      .eq("org_id", delivery.org_id)
      .eq("idempotency_key", idempotencyKey)
      .in("status", ["pending", "retrying"])
      .neq("id", delivery.id)
      .maybeSingle();
    if (inFlight) {
      throw new Error("Another attempt with the same idempotency key is already queued — wait for it to finish.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("webhook_deliveries")
      .update({
        status: "pending",
        next_attempt_at: new Date().toISOString(),
        // Reprocessing a dead letter gives it a fresh attempt budget.
        attempts: data.reset || delivery.status === "dead_letter" ? 0 : delivery.attempts,
        last_error: null,
        idempotency_key: idempotencyKey,
        replay_count: (delivery.replay_count ?? 0) + 1,
        last_replayed_at: new Date().toISOString(),
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
      metadata: { result: result.status, idempotency_key: idempotencyKey },
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

/* ============ ALERT CHANNELS ============ */

const ALERT_EVENTS = ["spend_limit", "dlq_failure"] as const;

export const listAlertChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("alert_channels")
      .select("id, org_id, kind, target, label, events, enabled, last_sent_at, last_error, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAlertChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid.optional(),
        kind: z.enum(["in_app", "email", "slack"]),
        target: z.string().trim().max(500).nullable().optional(),
        label: z.string().trim().max(120).nullable().optional(),
        events: z.array(z.enum(ALERT_EVENTS)).min(1),
        enabled: z.boolean(),
      })
      .superRefine((value, ctx) => {
        if (value.kind === "email" && !z.string().email().safeParse(value.target ?? "").success) {
          ctx.addIssue({ code: "custom", message: "Enter a valid email address", path: ["target"] });
        }
        if (value.kind === "slack" && !/^https:\/\/hooks\.slack\.com\/.+/.test(value.target ?? "")) {
          ctx.addIssue({
            code: "custom",
            message: "Slack needs an incoming webhook URL starting with https://hooks.slack.com/",
            path: ["target"],
          });
        }
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: workspace } = await context.supabase.from("org_members").select("org_id").limit(1).maybeSingle();
    if (!workspace) throw new Error("No workspace found for this account.");

    const payload = {
      org_id: workspace.org_id,
      kind: data.kind,
      target: data.kind === "in_app" ? null : (data.target ?? null),
      label: data.label ?? null,
      events: data.events,
      enabled: data.enabled,
      created_by: context.userId,
      last_error: null,
    };

    const query = data.id
      ? context.supabase.from("alert_channels").update(payload).eq("id", data.id)
      : context.supabase.from("alert_channels").insert(payload);

    const { data: saved, error } = await query.select("id, kind, target, events, enabled").maybeSingle();
    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate key")) {
        throw new Error("That alert destination is already configured.");
      }
      throw new Error(error.message);
    }
    if (!saved) throw new Error("Only admins and managers can change alert channels.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: workspace.org_id,
      actorId: context.userId,
      action: data.id ? "alerts.channel_updated" : "alerts.channel_added",
      targetType: "alert_channel",
      targetId: saved.id,
      metadata: { kind: saved.kind, events: saved.events, enabled: saved.enabled },
    });
    return saved;
  });

export const deleteAlertChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: removed, error } = await context.supabase
      .from("alert_channels")
      .delete()
      .eq("id", data.id)
      .select("id, org_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!removed) throw new Error("Only admins and managers can remove alert channels.");
    return { id: removed.id };
  });

export const testAlertChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: channel, error } = await context.supabase
      .from("alert_channels")
      .select("id, org_id, kind, events")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!channel) throw new Error("Alert channel not found");
    await requireManager(context as never, channel.org_id);

    const { dispatchAlert } = await import("@/lib/alerts.server");
    const results = await dispatchAlert({
      orgId: channel.org_id,
      event: (channel.events[0] ?? "spend_limit") as "spend_limit" | "dlq_failure",
      severity: "info",
      title: "Test alert from your AI Operating System",
      body: "If you can read this, alert delivery for spend stops and dead-letter failures is working.",
      dedupeKey: `test:${channel.id}:${Date.now()}`,
    });
    const mine = results.find((r) => r.channelId === channel.id);
    if (mine && !mine.ok) throw new Error(mine.error ?? "Delivery failed");
    return { ok: true, kind: channel.kind };
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

export type RetentionPreview = {
  retention_days: number;
  cutoff: string;
  live_count: number;
  live_bytes: number;
  live_oldest: string | null;
  live_newest: string | null;
  stale_count: number;
  stale_bytes: number;
  stale_oldest: string | null;
  stale_newest: string | null;
  archived_count: number;
  archived_bytes: number;
  events_per_day: number;
  bytes_per_day: number;
};

/**
 * Dry run: projects storage impact for a candidate retention window and returns
 * a sample of the exact log events that a purge/archive pass would touch.
 */
export const getRetentionPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ days: z.number().int().min(1).max(3650).optional() }).parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { data: workspace } = await context.supabase.from("org_members").select("org_id").limit(1).maybeSingle();
    if (!workspace) throw new Error("No workspace found for this account.");

    const { data: preview, error } = await context.supabase.rpc("retention_preview", {
      _org_id: workspace.org_id,
      _days: data.days ?? null,
    });
    if (error) throw new Error(error.message);

    const stats = preview as unknown as RetentionPreview;

    const { data: sample } = await context.supabase
      .from("run_logs")
      .select("id, run_id, level, message, created_at")
      .lt("created_at", stats.cutoff)
      .order("created_at", { ascending: true })
      .limit(25);

    const { data: settings } = await context.supabase
      .from("org_settings")
      .select("archive_logs, last_retention_run_at, log_retention_days")
      .maybeSingle();

    return {
      stats,
      sample: sample ?? [],
      archiveLogs: settings?.archive_logs ?? false,
      lastRunAt: settings?.last_retention_run_at ?? null,
      savedDays: settings?.log_retention_days ?? 30,
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

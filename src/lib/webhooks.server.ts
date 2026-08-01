import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_DELAY_SECONDS = 30;

/** Exponential backoff: 30s, 2m, 8m, 32m, 2h8m … capped at 6 hours. */
export function backoffSeconds(attempt: number) {
  return Math.min(BASE_DELAY_SECONDS * 4 ** Math.max(0, attempt - 1), 6 * 60 * 60);
}

function sign(body: string) {
  const secret = process.env["N8N_WEBHOOK_SECRET"];
  if (!secret) return null;
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Queues an outbound n8n callback. Delivery itself happens in attemptDelivery. */
export async function enqueueWebhook(params: {
  orgId: string;
  agentId: string;
  runId: string;
  url: string;
  event: string;
  payload: Record<string, unknown>;
}) {
  const { data } = await supabaseAdmin
    .from("webhook_deliveries")
    .insert({
      org_id: params.orgId,
      agent_id: params.agentId,
      run_id: params.runId,
      url: params.url,
      event: params.event,
      payload: params.payload as never,
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  return data?.id ?? null;
}

async function markRunLog(orgId: string, runId: string | null, message: string, level: string) {
  if (!runId) return;
  await supabaseAdmin.from("run_logs").insert({ org_id: orgId, run_id: runId, level, message });
}

/**
 * Delivers one queued webhook. On failure it schedules the next retry with
 * exponential backoff, and once max_attempts is spent the row moves to the
 * dead-letter queue (status = 'dead_letter') and a notification is raised.
 */
export async function attemptDelivery(deliveryId: string) {
  const { data: delivery } = await supabaseAdmin
    .from("webhook_deliveries")
    .select("*")
    .eq("id", deliveryId)
    .maybeSingle();
  if (!delivery) return { ok: false, status: "missing" as const };
  if (delivery.status === "delivered") return { ok: true, status: "delivered" as const };

  const attempt = delivery.attempts + 1;
  const body = JSON.stringify({
    event: delivery.event,
    delivery_id: delivery.id,
    run_id: delivery.run_id,
    attempt,
    payload: delivery.payload,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Delivery-Id": delivery.id,
    "X-Delivery-Attempt": String(attempt),
  };
  const signature = sign(body);
  if (signature) headers["X-Signature-256"] = `sha256=${signature}`;

  let statusCode: number | null = null;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(delivery.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    statusCode = response.status;
    if (!response.ok) {
      errorMessage = (await response.text()).slice(0, 800) || `HTTP ${response.status}`;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  if (!errorMessage) {
    await supabaseAdmin
      .from("webhook_deliveries")
      .update({
        status: "delivered",
        attempts: attempt,
        last_status_code: statusCode,
        last_error: null,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);
    await markRunLog(
      delivery.org_id,
      delivery.run_id,
      `Webhook delivered to n8n on attempt ${attempt} (HTTP ${statusCode}).`,
      "info",
    );
    return { ok: true, status: "delivered" as const };
  }

  const exhausted = attempt >= delivery.max_attempts;
  const nextAttemptAt = new Date(Date.now() + backoffSeconds(attempt) * 1000).toISOString();

  await supabaseAdmin
    .from("webhook_deliveries")
    .update({
      status: exhausted ? "dead_letter" : "retrying",
      attempts: attempt,
      last_status_code: statusCode,
      last_error: errorMessage,
      next_attempt_at: exhausted ? new Date().toISOString() : nextAttemptAt,
    })
    .eq("id", delivery.id);

  await markRunLog(
    delivery.org_id,
    delivery.run_id,
    exhausted
      ? `Webhook delivery failed permanently after ${attempt} attempts — moved to dead-letter queue. Last error: ${errorMessage}`
      : `Webhook attempt ${attempt} failed (${errorMessage}). Retrying at ${nextAttemptAt}.`,
    exhausted ? "error" : "warn",
  );

  if (exhausted) {
    await supabaseAdmin.from("notifications").insert({
      org_id: delivery.org_id,
      title: "Webhook delivery dead-lettered",
      body: `${attempt} attempts to ${delivery.url} failed. Last error: ${errorMessage}`,
      severity: "error",
    });
    await supabaseAdmin.from("audit_logs").insert({
      org_id: delivery.org_id,
      actor_id: null,
      action: "webhook.dead_lettered",
      target_type: "webhook_delivery",
      target_id: delivery.id,
      metadata: { attempts: attempt, error: errorMessage } as never,
    });
  }

  return { ok: false, status: exhausted ? ("dead_letter" as const) : ("retrying" as const) };
}

/** Drains everything that is due: fresh deliveries plus retries past their backoff. */
export async function processWebhookQueue(orgId: string, limit = 25) {
  const { data: due } = await supabaseAdmin
    .from("webhook_deliveries")
    .select("id")
    .eq("org_id", orgId)
    .in("status", ["pending", "retrying"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  let delivered = 0;
  let failed = 0;
  for (const row of due ?? []) {
    const result = await attemptDelivery(row.id);
    if (result.ok) delivered += 1;
    else failed += 1;
  }
  return { processed: (due ?? []).length, delivered, failed };
}

import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Rough USD cost per 1M tokens, used for per-agent cost tracking. */
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "google/gemini-3.6-flash": { input: 0.3, output: 2.5 },
  "google/gemini-3.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-3.1-flash-lite": { input: 0.1, output: 0.4 },
  "google/gemini-3.1-pro-preview": { input: 1.25, output: 10 },
  "google/gemini-3.1-flash-image": { input: 0.3, output: 2.5 },
  "openai/gpt-5.4": { input: 1.25, output: 10 },
  "openai/gpt-5.4-mini": { input: 0.25, output: 2 },
  "openai/gpt-5.5": { input: 1.75, output: 14 },
};

export function estimateCost(model: string, promptTokens: number, completionTokens: number) {
  const rate = MODEL_RATES[model] ?? { input: 0.5, output: 3 };
  return (promptTokens / 1_000_000) * rate.input + (completionTokens / 1_000_000) * rate.output;
}

export function applyPlaceholders(prompt: string, placeholders: Record<string, unknown>) {
  return prompt.replace(/\{([a-z0-9_]+)\}/gi, (match, key: string) => {
    const value = placeholders?.[key];
    if (value === undefined || value === null || String(value).trim() === "") return match;
    return String(value);
  });
}

async function log(orgId: string, runId: string, message: string, level = "info") {
  await supabaseAdmin.from("run_logs").insert({
    org_id: orgId,
    run_id: runId,
    level,
    message,
  });
}

export async function auditLog(params: {
  orgId: string;
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    org_id: params.orgId,
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    metadata: (params.metadata ?? {}) as never,
  });
}

/**
 * Executes a queued/approved run: resolves the agent prompt, calls the model
 * through Lovable AI, and records output, tokens, cost, duration and logs.
 * Safety gating happens BEFORE this is ever called.
 */
export async function executeRun(runId: string) {
  const { data: run, error: runError } = await supabaseAdmin
    .from("agent_runs")
    .select("id, org_id, agent_id, input, requested_by")
    .eq("id", runId)
    .single();
  if (runError || !run) throw new Error("Run not found");

  const { data: agent, error: agentError } = await supabaseAdmin
    .from("agents")
    .select("id, name, slug, system_prompt, model, status, safety_rating, webhook_url")
    .eq("id", run.agent_id)
    .single();
  if (agentError || !agent) throw new Error("Agent not found");

  /** Queues the n8n callback (if configured) and tries it once immediately. */
  async function dispatchWebhook(event: string, payload: Record<string, unknown>) {
    if (!agent?.webhook_url) return;
    const { enqueueWebhook, attemptDelivery } = await import("./webhooks.server");
    const deliveryId = await enqueueWebhook({
      orgId: run!.org_id,
      agentId: agent.id,
      runId: runId,
      url: agent.webhook_url,
      event,
      payload,
    });
    if (deliveryId) await attemptDelivery(deliveryId);
  }


  const { data: settings } = await supabaseAdmin
    .from("org_settings")
    .select("placeholders")
    .eq("org_id", run.org_id)
    .maybeSingle();

  const placeholders = (settings?.placeholders ?? {}) as Record<string, unknown>;
  const systemPrompt = applyPlaceholders(agent.system_prompt, placeholders);

  await supabaseAdmin
    .from("agent_runs")
    .update({ status: "running", model: agent.model })
    .eq("id", runId);
  await log(run.org_id, runId, `Run started — ${agent.name} (safety ${agent.safety_rating}/5)`);
  await log(run.org_id, runId, `Model: ${agent.model}. System prompt resolved with organization placeholders.`);

  const started = Date.now();
  try {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const gateway = createLovableAiGatewayProvider(apiKey);

    // Short-term memory: last 6 turns for this agent + user.
    const { data: memory } = await supabaseAdmin
      .from("agent_memory")
      .select("role, content")
      .eq("agent_id", agent.id)
      .eq("user_id", run.requested_by)
      .eq("kind", "short")
      .order("created_at", { ascending: false })
      .limit(6);

    const history = (memory ?? []).reverse().map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    }));

    const result = await generateText({
      model: gateway(agent.model),
      system: systemPrompt,
      messages: [...history, { role: "user", content: run.input }],
    });

    const promptTokens = result.usage?.inputTokens ?? 0;
    const completionTokens = result.usage?.outputTokens ?? 0;
    const cost = estimateCost(agent.model, promptTokens, completionTokens);
    const duration = Date.now() - started;

    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: "succeeded",
        output: result.text,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: cost,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    await log(
      run.org_id,
      runId,
      `Completed in ${duration}ms — ${promptTokens} in / ${completionTokens} out tokens, $${cost.toFixed(6)}`,
    );

    await supabaseAdmin.from("agent_memory").insert([
      {
        org_id: run.org_id,
        agent_id: agent.id,
        user_id: run.requested_by,
        kind: "short",
        role: "user",
        content: run.input,
      },
      {
        org_id: run.org_id,
        agent_id: agent.id,
        user_id: run.requested_by,
        kind: "short",
        role: "assistant",
        content: result.text.slice(0, 4000),
      },
    ]);

    await auditLog({
      orgId: run.org_id,
      actorId: run.requested_by,
      action: "agent.run.succeeded",
      targetType: "agent",
      targetId: agent.slug,
      metadata: { run_id: runId, cost_usd: cost, model: agent.model },
    });

    // Re-check spend after the fact so a run that crosses a cap alerts immediately.
    const { enforceSpendLimits } = await import("./spend.server");
    await enforceSpendLimits({ orgId: run.org_id, agentId: agent.id, agentName: agent.name }).catch(
      () => undefined,
    );

    await dispatchWebhook("agent.run.succeeded", {
      agent: { id: agent.id, slug: agent.slug, name: agent.name },
      status: "succeeded",
      input: run.input,
      output: result.text,
      cost_usd: cost,
      duration_ms: duration,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
    });

    return { status: "succeeded" as const, output: result.text, runId, cost, duration };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - started;
    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: "failed",
        error: message,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    await log(run.org_id, runId, `Failed: ${message}`, "error");
    await supabaseAdmin.from("notifications").insert({
      org_id: run.org_id,
      user_id: run.requested_by,
      title: `${agent.name} run failed`,
      body: message,
      severity: "error",
    });
    await auditLog({
      orgId: run.org_id,
      actorId: run.requested_by,
      action: "agent.run.failed",
      targetType: "agent",
      targetId: agent.slug,
      metadata: { run_id: runId, error: message },
    });
    return { status: "failed" as const, output: null, runId, error: message };
  }
}

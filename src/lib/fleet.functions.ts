import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

/** Current user's org, role and profile. Every other call is scoped to this. */
export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: memberships } = await supabase
      .from("org_members")
      .select("org_id, organizations(id, name, slug)")
      .order("created_at", { ascending: true });

    const orgs = (memberships ?? [])
      .map((m) => m.organizations)
      .filter((o): o is { id: string; name: string; slug: string } => Boolean(o));

    const activeOrg = orgs[0] ?? null;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, org_id")
      .eq("user_id", userId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    const orgRoles = (roles ?? []).filter((r) => r.org_id === activeOrg?.id).map((r) => r.role);

    return {
      userId,
      profile: profile ?? null,
      orgs,
      activeOrg,
      roles: orgRoles,
      canManage: orgRoles.some((r) => r === "admin" || r === "manager"),
    };
  });

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agents")
      .select(
        "id, org_id, slug, name, category, safety_rating, safety_justification, permissions, escalation_rules, required_connectors, system_prompt, model, status, requires_approval, webhook_url, version, sort_order",
      )
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAgent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: agent, error } = await context.supabase
      .from("agents")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!agent) throw new Error("Agent not found");

    const { data: versions } = await context.supabase
      .from("agent_versions")
      .select("id, version, system_prompt, model, requires_approval, change_note, created_at, changed_by")
      .eq("agent_id", agent.id)
      .order("version", { ascending: false });

    const { data: runs } = await context.supabase
      .from("agent_runs")
      .select("id, status, input, output, error, cost_usd, prompt_tokens, completion_tokens, duration_ms, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: connectors } = await context.supabase
      .from("connectors")
      .select("provider, label, connected")
      .in("provider", agent.required_connectors.length ? agent.required_connectors : ["__none__"]);

    return { agent, versions: versions ?? [], runs: runs ?? [], connectors: connectors ?? [] };
  });

export const setAgentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ agentId: uuid, status: z.enum(["active", "paused"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: agent, error } = await context.supabase
      .from("agents")
      .update({ status: data.status })
      .eq("id", data.agentId)
      .select("id, slug, status, org_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!agent) throw new Error("You do not have permission to change this agent.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: agent.org_id,
      actorId: context.userId,
      action: `agent.${data.status}`,
      targetType: "agent",
      targetId: agent.slug,
    });
    return agent;
  });

export const updateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        agentId: uuid,
        systemPrompt: z.string().min(20).max(20000),
        model: z.string().min(3).max(80),
        requiresApproval: z.boolean(),
        webhookUrl: z.string().max(500).optional().nullable(),
        changeNote: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: current, error: readError } = await context.supabase
      .from("agents")
      .select("id, org_id, slug, version, safety_rating, system_prompt, model, requires_approval")
      .eq("id", data.agentId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("Agent not found");

    // Hard rule: safety 4-5 agents can never have the approval gate removed.
    const requiresApproval = current.safety_rating >= 4 ? true : data.requiresApproval;

    // Snapshot the outgoing version first so rollback always has a target.
    await context.supabase.from("agent_versions").insert({
      org_id: current.org_id,
      agent_id: current.id,
      version: current.version,
      system_prompt: current.system_prompt,
      model: current.model,
      requires_approval: current.requires_approval,
      changed_by: context.userId,
      change_note: data.changeNote ?? null,
    });

    const { data: updated, error } = await context.supabase
      .from("agents")
      .update({
        system_prompt: data.systemPrompt,
        model: data.model,
        requires_approval: requiresApproval,
        webhook_url: data.webhookUrl?.trim() ? data.webhookUrl.trim() : null,
        version: current.version + 1,
      })
      .eq("id", data.agentId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Only admins and managers can edit agents.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: current.org_id,
      actorId: context.userId,
      action: "agent.updated",
      targetType: "agent",
      targetId: current.slug,
      metadata: { version: current.version + 1 },
    });
    return updated;
  });

export const rollbackAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ versionId: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: version, error } = await context.supabase
      .from("agent_versions")
      .select("agent_id, org_id, system_prompt, model, requires_approval, version")
      .eq("id", data.versionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!version) throw new Error("Version not found");

    const { data: agent } = await context.supabase
      .from("agents")
      .select("id, version, safety_rating, system_prompt, model, requires_approval, slug")
      .eq("id", version.agent_id)
      .single();

    await context.supabase.from("agent_versions").insert({
      org_id: version.org_id,
      agent_id: version.agent_id,
      version: agent!.version,
      system_prompt: agent!.system_prompt,
      model: agent!.model,
      requires_approval: agent!.requires_approval,
      changed_by: context.userId,
      change_note: `Replaced by rollback to v${version.version}`,
    });

    const { data: updated, error: updateError } = await context.supabase
      .from("agents")
      .update({
        system_prompt: version.system_prompt,
        model: version.model,
        requires_approval: agent!.safety_rating >= 4 ? true : version.requires_approval,
        version: agent!.version + 1,
      })
      .eq("id", version.agent_id)
      .select("*")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) throw new Error("Only admins and managers can roll back agents.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: version.org_id,
      actorId: context.userId,
      action: "agent.rolled_back",
      targetType: "agent",
      targetId: agent!.slug,
      metadata: { to_version: version.version },
    });
    return updated;
  });

/**
 * Runs an agent. Safety 4-5 (or any agent flagged requires_approval) is hard
 * gated: the run is created as pending_approval and NOTHING executes until an
 * admin/manager approves it. There is no bypass path.
 */
export const runAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ agentId: uuid, input: z.string().min(1).max(20000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: agent, error } = await context.supabase
      .from("agents")
      .select("id, org_id, name, slug, status, requires_approval, safety_rating, model, required_connectors")
      .eq("id", data.agentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!agent) throw new Error("Agent not found");
    if (agent.status !== "active") throw new Error(`${agent.name} is paused. Activate it before running.`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { executeRun, auditLog } = await import("@/lib/agent-exec.server");

    // Hard cost guardrail: blocks before anything is created or executed.
    const { enforceSpendLimits } = await import("@/lib/spend.server");
    await enforceSpendLimits({ orgId: agent.org_id, agentId: agent.id, agentName: agent.name });

    const gated = agent.requires_approval || agent.safety_rating >= 4;


    const { data: run, error: runError } = await supabaseAdmin
      .from("agent_runs")
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        requested_by: context.userId,
        status: gated ? "pending_approval" : "queued",
        input: data.input,
        model: agent.model,
      })
      .select("id")
      .single();
    if (runError || !run) throw new Error(runError?.message ?? "Could not create run");

    await supabaseAdmin.from("run_logs").insert({
      org_id: agent.org_id,
      run_id: run.id,
      message: gated
        ? `Run requested for ${agent.name} (safety ${agent.safety_rating}/5). Held for human approval — nothing has executed.`
        : `Run queued for ${agent.name} (safety ${agent.safety_rating}/5).`,
    });

    if (gated) {
      await supabaseAdmin.from("approvals").insert({
        org_id: agent.org_id,
        run_id: run.id,
        agent_id: agent.id,
        requested_by: context.userId,
      });
      await supabaseAdmin.from("notifications").insert({
        org_id: agent.org_id,
        title: `Approval required — ${agent.name}`,
        body: `A safety ${agent.safety_rating}/5 agent run is waiting for human approval.`,
        severity: "warning",
      });
      await auditLog({
        orgId: agent.org_id,
        actorId: context.userId,
        action: "agent.run.approval_requested",
        targetType: "agent",
        targetId: agent.slug,
        metadata: { run_id: run.id },
      });
      return { runId: run.id, status: "pending_approval" as const, output: null };
    }

    const result = await executeRun(run.id);
    return { runId: run.id, status: result.status, output: result.output ?? null };
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ approvalId: uuid, approve: z.boolean(), reason: z.string().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: approval, error } = await context.supabase
      .from("approvals")
      .select("id, org_id, run_id, agent_id, status")
      .eq("id", data.approvalId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!approval) throw new Error("Approval not found");
    if (approval.status !== "pending") throw new Error("This request has already been decided.");

    // Role check runs as the caller through RLS-safe RPC — never as admin.
    const { data: canManage } = await context.supabase.rpc("can_manage", { _org_id: approval.org_id });
    if (!canManage) throw new Error("Only admins and managers can approve agent runs.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { executeRun, auditLog } = await import("@/lib/agent-exec.server");
    const decidedAt = new Date().toISOString();

    await supabaseAdmin
      .from("approvals")
      .update({
        status: data.approve ? "approved" : "denied",
        decided_by: context.userId,
        decided_at: decidedAt,
        reason: data.reason ?? null,
      })
      .eq("id", approval.id);

    await supabaseAdmin.from("run_logs").insert({
      org_id: approval.org_id,
      run_id: approval.run_id,
      level: data.approve ? "info" : "warn",
      message: `${data.approve ? "Approved" : "Denied"} by ${context.userId} at ${decidedAt}.`,
    });

    await auditLog({
      orgId: approval.org_id,
      actorId: context.userId,
      action: data.approve ? "approval.approved" : "approval.denied",
      targetType: "run",
      targetId: approval.run_id,
      metadata: { decided_at: decidedAt },
    });

    if (!data.approve) {
      await supabaseAdmin
        .from("agent_runs")
        .update({ status: "rejected", completed_at: decidedAt })
        .eq("id", approval.run_id);
      return { status: "rejected" as const, output: null };
    }

    const { data: gatedAgent } = await supabaseAdmin
      .from("agents")
      .select("id, name")
      .eq("id", approval.agent_id)
      .maybeSingle();
    const { enforceSpendLimits } = await import("@/lib/spend.server");
    await enforceSpendLimits({
      orgId: approval.org_id,
      agentId: approval.agent_id,
      agentName: gatedAgent?.name ?? "agent",
    });

    await supabaseAdmin.from("agent_runs").update({ status: "queued" }).eq("id", approval.run_id);
    const result = await executeRun(approval.run_id);
    return { status: result.status, output: result.output ?? null };

  });

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("approvals")
      .select(
        "id, status, reason, created_at, decided_at, decided_by, requested_by, run_id, agents(name, slug, safety_rating), agent_runs(input, status, output)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agent_runs")
      .select(
        "id, status, input, output, error, cost_usd, prompt_tokens, completion_tokens, duration_ms, model, created_at, agents(name, slug, safety_rating, category)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRunLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ runId: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: logs, error } = await context.supabase
      .from("run_logs")
      .select("id, level, message, created_at")
      .eq("run_id", data.runId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return logs ?? [];
  });

/**
 * Fleet-wide log tail: the most recent events across every run in the workspace,
 * already joined to the run + agent so the stream can be labelled and filtered.
 * RLS scopes rows to the caller's org.
 */
export const getFleetActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ limit: z.number().int().min(20).max(400).default(150) })
      .partial()
      .default({})
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 150;

    const { data: logs, error } = await context.supabase
      .from("run_logs")
      .select("id, run_id, level, message, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const runIds = [...new Set((logs ?? []).map((l) => l.run_id))];

    const { data: runs } = runIds.length
      ? await context.supabase
          .from("agent_runs")
          .select("id, status, input, created_at, completed_at, agents(name, slug, safety_rating, category)")
          .in("id", runIds)
      : { data: [] };

    // Runs currently in flight, even if they have not logged anything yet.
    const { data: active } = await context.supabase
      .from("agent_runs")
      .select("id, status, input, created_at, agents(name, slug, safety_rating)")
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(25);

    return {
      logs: (logs ?? []).reverse(),
      runs: runs ?? [],
      active: active ?? [],
    };
  });

/** Labels for runs that appeared in the live stream after the initial seed. */
export const getRunLabels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ runIds: z.array(uuid).min(1).max(50) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: runs, error } = await context.supabase
      .from("agent_runs")
      .select("id, status, input, created_at, completed_at, agents(name, slug, safety_rating, category)")
      .in("id", data.runIds);
    if (error) throw new Error(error.message);
    return runs ?? [];
  });



export const listConnectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("connectors")
      .select("id, provider, label, connected, account_ref, setup_notes, env_keys, updated_at")
      .order("label", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setConnectorState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ connectorId: uuid, connected: z.boolean(), accountRef: z.string().max(200).optional() })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: connector, error } = await context.supabase
      .from("connectors")
      .update({
        connected: data.connected,
        account_ref: data.accountRef?.trim() ? data.accountRef.trim() : null,
      })
      .eq("id", data.connectorId)
      .select("id, provider, connected, org_id, account_ref")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connector) throw new Error("Only admins and managers can change connectors.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: connector.org_id,
      actorId: context.userId,
      action: data.connected ? "connector.connected" : "connector.disconnected",
      targetType: "connector",
      targetId: connector.provider,
    });
    return connector;
  });

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [agents, runs, approvals, logs] = await Promise.all([
      context.supabase.from("agents").select("id, name, slug, category, safety_rating, status"),
      context.supabase
        .from("agent_runs")
        .select("id, status, cost_usd, prompt_tokens, completion_tokens, created_at, agent_id, agents(name, slug)")
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      context.supabase.from("approvals").select("id, status").eq("status", "pending"),
      context.supabase
        .from("run_logs")
        .select("id, level, message, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    return {
      agents: agents.data ?? [],
      runs: runs.data ?? [],
      pendingApprovals: (approvals.data ?? []).length,
      recentLogs: logs.data ?? [],
    };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("org_settings")
      .select("org_id, placeholders, updated_at")
      .maybeSingle();
    return data ?? null;
  });

export const updatePlaceholders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ placeholders: z.record(z.string(), z.string().max(500)) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: settings, error } = await context.supabase
      .from("org_settings")
      .update({ placeholders: data.placeholders as never, updated_at: new Date().toISOString() })
      .select("org_id, placeholders")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!settings) throw new Error("Only admins and managers can change organization settings.");

    const { auditLog } = await import("@/lib/agent-exec.server");
    await auditLog({
      orgId: settings.org_id,
      actorId: context.userId,
      action: "settings.placeholders_updated",
      targetType: "org",
      targetId: settings.org_id,
    });
    return settings;
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: members } = await context.supabase
      .from("org_members")
      .select("id, user_id, created_at, org_id");
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role, org_id");
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url");

    return (members ?? []).map((m) => ({
      ...m,
      roles: (roles ?? []).filter((r) => r.user_id === m.user_id).map((r) => r.role),
      profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? null,
    }));
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, actor_id, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

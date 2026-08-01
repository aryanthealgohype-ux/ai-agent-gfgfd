import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_runs",
  title: "List agent runs",
  description:
    "List recent agent runs in the workspace with status, cost, tokens and timing. Optionally filter by agent slug or status.",
  inputSchema: {
    slug: z.string().trim().optional().describe("Only runs for this agent slug."),
    status: z
      .enum(["queued", "running", "succeeded", "failed", "pending_approval", "rejected", "any"])
      .optional()
      .describe("Filter by run status. Defaults to any."),
    limit: z.number().int().optional().describe("Max rows, 1-50. Defaults to 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    let query = supabase
      .from("agent_runs")
      .select(
        "id, status, input, output, error, model, cost_usd, prompt_tokens, completion_tokens, duration_ms, created_at, completed_at, agents(name, slug, safety_rating)",
      )
      .order("created_at", { ascending: false })
      .limit(take);
    if (status && status !== "any") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return fail(error.message);
    const runs = (data ?? []).filter((run) => {
      if (!slug) return true;
      const agent = run.agents as { slug?: string } | null;
      return agent?.slug === slug;
    });
    return ok({ runs, count: runs.length });
  },
});

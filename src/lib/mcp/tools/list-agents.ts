import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_agents",
  title: "List agents",
  description:
    "List the AI agents in the caller's workspace with category, safety rating, model and status.",
  inputSchema: {
    status: z
      .enum(["active", "paused", "any"])
      .optional()
      .describe("Filter by agent status. Defaults to any."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("agents")
      .select(
        "id, slug, name, category, safety_rating, status, model, requires_approval, required_connectors",
      )
      .order("sort_order", { ascending: true });
    if (status && status !== "any") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return fail(error.message);
    return ok({ agents: data ?? [], count: data?.length ?? 0 });
  },
});

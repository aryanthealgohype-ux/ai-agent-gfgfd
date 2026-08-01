import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_approvals",
  title: "List approvals",
  description:
    "List human-in-the-loop approval requests for high-safety agent runs, with requester, reason and decision state.",
  inputSchema: {
    status: z
      .enum(["pending", "approved", "denied", "any"])
      .optional()
      .describe("Filter by approval status. Defaults to pending."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const filter = status ?? "pending";
    let query = supabase
      .from("approvals")
      .select(
        "id, status, reason, created_at, decided_at, run_id, agents(name, slug, safety_rating), agent_runs(input, status)",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (filter !== "any") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) return fail(error.message);
    return ok({ approvals: data ?? [], count: data?.length ?? 0 });
  },
});

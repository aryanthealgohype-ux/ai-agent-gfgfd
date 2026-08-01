import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_run",
  title: "Get run transcript",
  description:
    "Get one agent run with its full event log (timestamps, levels, messages) so failures can be diagnosed.",
  inputSchema: {
    run_id: z.string().trim().min(1).describe("The agent run id (uuid)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ run_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const [{ data: run, error: runError }, { data: logs, error: logError }] = await Promise.all([
      supabase
        .from("agent_runs")
        .select(
          "id, status, input, output, error, model, cost_usd, prompt_tokens, completion_tokens, duration_ms, created_at, completed_at, agents(name, slug, safety_rating, category)",
        )
        .eq("id", run_id)
        .maybeSingle(),
      supabase
        .from("run_logs")
        .select("level, message, metadata, created_at")
        .eq("run_id", run_id)
        .order("created_at", { ascending: true }),
    ]);
    if (runError) return fail(runError.message);
    if (logError) return fail(logError.message);
    if (!run) return fail(`No run found with id "${run_id}".`);
    return ok({ run, events: logs ?? [] });
  },
});

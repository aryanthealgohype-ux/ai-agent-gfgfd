import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_agent",
  title: "Get agent definition",
  description:
    "Get one agent's full definition: role/system prompt, safety rating and justification, permissions, escalation rules and required connectors.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Agent slug, e.g. 'receptionist'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("agents")
      .select(
        "id, slug, name, category, safety_rating, safety_justification, permissions, escalation_rules, required_connectors, system_prompt, model, status, requires_approval, version",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail(`No agent found with slug "${slug}".`);
    return ok(data);
  },
});

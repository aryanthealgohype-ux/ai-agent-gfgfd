import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "set_agent_status",
  title: "Activate or pause an agent",
  description:
    "Activate or pause an agent in the workspace. Requires manager-level access; paused agents cannot be run.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Agent slug to update."),
    status: z.enum(["active", "paused"]).describe("New agent status."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ slug, status }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("agents")
      .update({ status })
      .eq("slug", slug)
      .select("id, slug, name, status")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data)
      return fail(
        `Could not update "${slug}". Either the agent does not exist or your role cannot manage agents.`,
      );
    return ok(data);
  },
});

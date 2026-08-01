import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAgentsTool from "./tools/list-agents";
import getAgentTool from "./tools/get-agent";
import listRunsTool from "./tools/list-runs";
import getRunTool from "./tools/get-run";
import listApprovalsTool from "./tools/list-approvals";
import setAgentStatusTool from "./tools/set-agent-status";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "ai-agent-commander",
  title: "AI Agent Commander",
  version: "0.1.0",
  instructions:
    "Tools for the AI Agent Commander workspace. Use `list_agents` and `get_agent` to inspect the agent fleet and their safety-rated role prompts, `list_runs` and `get_run` to review executions and diagnose failures, `list_approvals` to see pending human-in-the-loop gates, and `set_agent_status` to activate or pause an agent. All data is scoped to the signed-in user's workspace.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listAgentsTool,
    getAgentTool,
    listRunsTool,
    getRunTool,
    listApprovalsTool,
    setAgentStatusTool,
  ],
});

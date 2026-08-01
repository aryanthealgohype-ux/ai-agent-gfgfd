import React, { useState } from "react";
import { Terminal, Code, Cpu, Sparkles, Check, Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CODE_EXAMPLES = {
  curl: `curl -X POST "https://api.ai-os.com/v1/agents/reception_agent/run" \\
  -H "Authorization: Bearer $AI_OS_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "Review incoming invoice files",
    "params": { "safety_gating": true }
  }'`,
  node: `import { AgentFleet } from "@lovable/ai-os-sdk";

const fleet = new AgentFleet({ apiKey: process.env.AI_OS_KEY });

const result = await fleet.run("reception_agent", {
  task: "Review incoming invoice files",
  params: { safety_gating: true }
});

console.log(\`Execution complete. Latency: \${result.latency}ms\`);`,
  python: `from ai_os_sdk import AgentFleet

fleet = AgentFleet(api_key="your_api_key")

result = fleet.run(
    agent_id="reception_agent",
    task="Review incoming invoice files",
    params={"safety_gating": True}
)

print(f"Agent finished. Status: {result.status}")`
};

export function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<"curl" | "node" | "python">("curl");
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleTestApi = () => {
    setIsRunning(true);
    setResponseOutput(null);
    toast.info("Sending request to mock sandbox server...");

    setTimeout(() => {
      setResponseOutput(JSON.stringify({
        status: "success",
        agent: "reception_agent.py",
        execution_id: "run_req_9832049",
        metrics: {
          latency_ms: 132,
          tokens_used: 120,
          cost_usd: 0.0024
        },
        output: "Successfully ingested and parsed incoming task request."
      }, null, 2));
      setIsRunning(false);
      toast.success("Sandbox request complete!");
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-12 relative z-10 font-sans">
      
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 font-bold">Developer SDK & API</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
          Build on the AI Operating System
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Trigger agent executions, listen to webhooks, and automate pipelines using our cURL endpoints, Node.js SDK, or Python SDK.
        </p>
      </div>

      {/* Code Playground */}
      <div className="grid lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left editor */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-300 overflow-hidden shadow-2xl min-h-[360px]">
          
          <div>
            {/* Header Tabs */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800/80">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-red-500/70" />
                <span className="size-3 rounded-full bg-yellow-500/70" />
                <span className="size-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex gap-2">
                {(["curl", "node", "python"] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setResponseOutput(null);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors uppercase ${activeTab === tab ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Field */}
            <pre className="p-5 font-mono text-[10px] text-zinc-200 overflow-x-auto leading-relaxed select-text">
              <code>{CODE_EXAMPLES[activeTab]}</code>
            </pre>
          </div>

          {/* Action button */}
          <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800/80 flex justify-between items-center text-[10px] text-zinc-500">
            <span>Server: api.ai-os.com/v1</span>
            <Button 
              size="sm" 
              onClick={handleTestApi}
              disabled={isRunning}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] h-7 px-3.5 flex items-center gap-1 font-mono font-bold"
            >
              <Play className="size-3 fill-white" /> Send Sandbox Request
            </Button>
          </div>

        </div>

        {/* Right JSON Response Output */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-6 shadow-sm min-h-[360px]">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wide flex items-center gap-1.5"><Terminal className="size-4 text-violet-600" /> Response Output</h3>
            
            {responseOutput ? (
              <pre className="p-4 bg-white border border-zinc-200 rounded-xl font-mono text-[9px] text-zinc-700 leading-relaxed overflow-x-auto">
                <code>{responseOutput}</code>
              </pre>
            ) : isRunning ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-zinc-400 font-mono animate-pulse">
                <span>POST https://api.ai-os.com/v1/...</span>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-xs text-zinc-400 border border-zinc-200/60 border-dashed rounded-xl p-4 text-center">
                <Code className="size-6 text-zinc-300 mb-2" />
                <span>Click "Send Sandbox Request" to execute cURL code locally.</span>
              </div>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 font-mono">Sandbox API client initialized</span>
        </div>

      </div>

      {/* Docs link */}
      <div className="flex justify-center pt-6">
        <Button asChild variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 text-xs font-semibold">
          <Link to="/docs"><BookOpen className="size-4" /> Go to Full API Reference Docs</Link>
        </Button>
      </div>

    </div>
  );
}

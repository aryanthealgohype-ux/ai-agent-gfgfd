import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Workflow, 
  Play, 
  Settings, 
  Plus, 
  Trash2, 
  Cpu, 
  Database, 
  Mail, 
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkflowNode {
  id: string;
  name: string;
  type: "Trigger" | "Agent" | "Action" | "Integration";
  icon: any;
  status: "idle" | "running" | "success" | "gated";
  desc: string;
}

const INITIAL_NODES: WorkflowNode[] = [
  { id: "1", name: "On Support Ticket Ingest", type: "Trigger", icon: Zap, status: "idle", desc: "Monitors Zendesk triggers." },
  { id: "2", name: "triage_agent.py", type: "Agent", icon: Cpu, status: "idle", desc: "Analyzes sentiment & intent." },
  { id: "3", name: "Safety rating guard", type: "Action", icon: ShieldCheck, status: "idle", desc: "Audits outgoing transfers." },
  { id: "4", name: "Slack alert notify", type: "Integration", icon: Mail, status: "idle", desc: "Sends update message." }
];

export function WorkflowsPage() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentNodeIdx, setCurrentNodeIdx] = useState<number | null>(null);

  const handleRunWorkflow = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setCurrentNodeIdx(0);
    toast.info("Starting workflow execution...");

    // Simulate step by step execution
    let idx = 0;
    
    const runNextNode = () => {
      if (idx >= nodes.length) {
        setIsExecuting(false);
        setCurrentNodeIdx(null);
        setNodes(prev => prev.map(n => ({ ...n, status: "success" })));
        toast.success("Workflow completed successfully!");
        return;
      }

      setCurrentNodeIdx(idx);
      setNodes(prev => prev.map((n, i) => {
        if (i === idx) return { ...n, status: "running" };
        if (i < idx) return { ...n, status: "success" };
        return { ...n, status: "idle" };
      }));

      // Next step
      setTimeout(() => {
        idx++;
        runNextNode();
      }, 1500);
    };

    runNextNode();
  };

  const handleReset = () => {
    setNodes(INITIAL_NODES);
    setIsExecuting(false);
    setCurrentNodeIdx(null);
    toast.success("Workflow state reset");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-12 relative z-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-100 pb-8">
        <div className="space-y-4 max-w-2xl">
          <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 flex items-center gap-1.5 w-fit">
            <Workflow className="size-3" /> Visual Graph Editor
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
            Workflows Builder
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Design and orchestrate multi-agent pipelines visually. Connect trigger hooks, insert safety rating filters, and link integrations dynamically.
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset} 
            disabled={isExecuting}
            className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl"
          >
            Reset Flow
          </Button>
          <Button 
            onClick={handleRunWorkflow} 
            disabled={isExecuting}
            className="bg-zinc-950 text-white hover:bg-zinc-900 rounded-xl flex items-center gap-2"
          >
            <Play className="size-4 fill-white" /> {isExecuting ? "Executing..." : "Run Pipeline"}
          </Button>
        </div>
      </div>

      {/* Visual Canvas Simulator */}
      <div className="relative rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-8 sm:p-12 overflow-hidden shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="absolute inset-0 bg-grid-pattern-light opacity-50" />
        
        {/* SVG connection lines */}
        <svg className="absolute inset-0 size-full pointer-events-none hidden md:block">
          <defs>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="line-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          
          {/* Paths connecting nodes */}
          <path d="M 220 200 L 390 200" stroke="url(#line-grad)" strokeWidth="2" fill="none" />
          <path d="M 570 200 L 740 200" stroke="url(#line-grad)" strokeWidth="2" fill="none" />
          <path d="M 920 200 L 1090 200" stroke="url(#line-grad)" strokeWidth="2" fill="none" />

          {/* Active Flow pulses */}
          {isExecuting && currentNodeIdx !== null && (
            <motion.circle 
              r="4" 
              fill="#8b5cf6" 
              initial={{ cx: 220 + currentNodeIdx * 350, cy: 200 }}
              animate={{ cx: [220 + currentNodeIdx * 350, 220 + (currentNodeIdx + 1) * 350] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          )}
        </svg>

        {/* Nodes Grid Layout */}
        <div className="relative z-10 grid gap-8 md:grid-cols-4 w-full max-w-5xl">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isNodeActive = index === currentNodeIdx;
            return (
              <div key={node.id} className="flex flex-col items-center">
                
                {/* Node Box */}
                <div 
                  className={cn(
                    "w-full rounded-2xl border bg-white p-6 shadow-md transition-all duration-300 relative",
                    node.status === "running" ? "border-violet-500 ring-2 ring-violet-500/20" :
                    node.status === "success" ? "border-emerald-500" : "border-zinc-200/80 hover:border-zinc-300"
                  )}
                >
                  {/* Pulse Border for active */}
                  {isNodeActive && (
                    <span className="absolute -inset-px rounded-2xl border border-violet-500 animate-ping opacity-60 pointer-events-none" />
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">{node.type}</span>
                      
                      {node.status === "running" && <span className="size-2 bg-violet-600 rounded-full animate-ping" />}
                      {node.status === "success" && <CheckCircle2 className="size-4 text-emerald-500" />}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "flex size-10 items-center justify-center rounded-xl border font-bold text-xs select-none",
                        node.status === "running" ? "bg-violet-50 text-violet-600 border-violet-100" :
                        node.status === "success" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        "bg-zinc-50 border-zinc-200 text-zinc-700"
                      )}>
                        <Icon className="size-4" />
                      </span>
                      <h3 className="text-xs font-bold text-zinc-950">{node.name}</h3>
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-normal">{node.desc}</p>
                  </div>
                </div>

                {/* Mobile Connector Arrow */}
                {index < nodes.length - 1 && (
                  <div className="md:hidden my-4 text-zinc-300">
                    <ArrowRight className="size-6 rotate-90" />
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

      {/* Workflow Stats */}
      <div className="grid md:grid-cols-3 gap-6 pt-6 text-xs text-zinc-500 border-t border-zinc-100">
        <div>
          <span className="block text-zinc-800 font-bold">Execution Timeline</span>
          <span>4 steps executed in 6.0s total latency.</span>
        </div>
        <div>
          <span className="block text-zinc-800 font-bold">Trigger Webhook</span>
          <span>Listening on: `https://api.ai-os.com/workflows/4820/hook`</span>
        </div>
        <div>
          <span className="block text-zinc-800 font-bold">Data Output Schema</span>
          <span>JSON payload dispatched to Slack notify.</span>
        </div>
      </div>

    </div>
  );
}

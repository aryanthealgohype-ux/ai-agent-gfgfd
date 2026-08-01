import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Play,
  Shield,
  Activity,
  Cpu,
  Clock,
  Terminal,
  Search,
  ChevronRight,
  Database,
  Mail,
  Coins,
  ShieldCheck,
  Settings,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  category: "Data" | "Outreach" | "Finance" | "Ops" | "Security";
  icon: any;
  status: "ACTIVE" | "IDLE" | "GATED";
  safetyScore: number;
  connectedTools: string[];
  lastExecution: string;
  model: string;
  uptime: string;
  desc: string;
}

const AGENTS_LIST: Agent[] = [
  {
    id: "reception-agent",
    name: "reception_agent.py",
    category: "Ops",
    icon: Bot,
    status: "ACTIVE",
    safetyScore: 2,
    connectedTools: ["Slack", "Google Drive", "Gmail"],
    lastExecution: "3s ago",
    model: "GPT-4o",
    uptime: "99.99%",
    desc: "Ingests incoming user emails, parses attachment documents, and routes tasks to specialized agents.",
  },
  {
    id: "outreach-agent",
    name: "outreach_writer.py",
    category: "Outreach",
    icon: Mail,
    status: "ACTIVE",
    safetyScore: 1,
    connectedTools: ["HubSpot", "LinkedIn", "Gmail"],
    lastExecution: "15s ago",
    model: "Claude 3.5 Sonnet",
    uptime: "99.98%",
    desc: "Drafts personalized sales outreach messages based on CRM profile notes and handles initial follow-ups.",
  },
  {
    id: "finance-scheduler",
    name: "payout_scheduler.py",
    category: "Finance",
    icon: Coins,
    status: "GATED",
    safetyScore: 4,
    connectedTools: ["Stripe", "Postgres", "Slack"],
    lastExecution: "1m ago",
    model: "Gemini 1.5 Pro",
    uptime: "99.95%",
    desc: "Processes batch payments and outgoing invoices. Actions above $500 are automatically gated for manual review.",
  },
  {
    id: "security-auditor",
    name: "audit_logger.py",
    category: "Security",
    icon: ShieldCheck,
    status: "ACTIVE",
    safetyScore: 1,
    connectedTools: ["Supabase", "PagerDuty"],
    lastExecution: "Just now",
    model: "Llama 3.1 70B",
    uptime: "100.00%",
    desc: "Monitors the entire fleet network for abnormal token counts, credential leaks, and validation failures.",
  },
  {
    id: "data-extractor",
    name: "pdf_extractor.py",
    category: "Data",
    icon: Database,
    status: "IDLE",
    safetyScore: 2,
    connectedTools: ["Google Docs", "Airtable"],
    lastExecution: "4h ago",
    model: "GPT-4o mini",
    uptime: "99.97%",
    desc: "Parses complex PDF financial reports, converts tables into structural JSON arrays, and loads them to Airtable.",
  },
];

export function AgentsPage() {
  const [filter, setFilter] = useState<
    "All" | "Data" | "Outreach" | "Finance" | "Ops" | "Security"
  >("All");
  const [search, setSearch] = useState("");
  const [runningAgent, setRunningAgent] = useState<Agent | null>(null);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAgent = (agent: Agent) => {
    setRunningAgent(agent);
    setIsRunning(true);
    setRunLogs([
      `Initializing connection to ${agent.name}...`,
      `Using base model: ${agent.model}...`,
    ]);

    // Simulate runs
    setTimeout(() => {
      setRunLogs((prev) => [
        ...prev,
        `Checking connectors: ${agent.connectedTools.join(", ")}... OK.`,
      ]);
    }, 800);
    setTimeout(() => {
      setRunLogs((prev) => [...prev, `Retrieving task context...`]);
    }, 1500);
    setTimeout(() => {
      if (agent.status === "GATED") {
        setRunLogs((prev) => [
          ...prev,
          `[SAFETY AUDIT] Risk rating: ${agent.safetyScore}/5. Action requires human authorization.`,
        ]);
        toast.warning("Agent execution gated! Check security inbox.");
        setIsRunning(false);
      } else {
        setRunLogs((prev) => [
          ...prev,
          `Executing task...`,
          `Task completed successfully. Tokens: 312. Cost: $0.0062`,
        ]);
        toast.success(`${agent.name} executed successfully!`);
        setIsRunning(false);
      }
    }, 2500);
  };

  const filteredAgents = AGENTS_LIST.filter((a) => {
    const matchesCategory = filter === "All" || a.category === filter;
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-12 relative z-10">
      {/* Page Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
          Agent Fleet Directory
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Monitor and configure the 23 pre-seeded, specialized AI agents running in your company
          fleet. Trigger manual test runs, audit safety scores, and configure API integrations.
        </p>
      </div>

      {/* Filter Tools bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-zinc-100 pb-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {["All", "Ops", "Outreach", "Finance", "Security", "Data"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                filter === cat
                  ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                  : "bg-zinc-50 text-zinc-500 border-zinc-200/60 hover:bg-zinc-100 hover:text-zinc-950",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="pl-9 text-xs border-zinc-200 bg-white/60 focus-visible:ring-violet-500"
          />
        </div>
      </div>

      {/* Agents Card Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredAgents.map((agent) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/60 p-6 hover:border-zinc-300 hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    {/* Name & Icon */}
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-800 group-hover:scale-105 transition-transform duration-300">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-950">{agent.name}</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Model: {agent.model}</p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          "text-[9px] font-bold tracking-wide uppercase px-2 py-0.5",
                          agent.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-none"
                            : agent.status === "GATED"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-none"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200 shadow-none",
                        )}
                      >
                        {agent.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed">{agent.desc}</p>
                </div>

                {/* Lower Technical Metrics */}
                <div className="mt-6 pt-4 border-t border-zinc-100/60 grid grid-cols-3 gap-2 text-[10px] text-zinc-400">
                  {/* Uptime */}
                  <div>
                    <span className="block font-semibold text-zinc-800">{agent.uptime}</span>
                    <span>Uptime SLA</span>
                  </div>

                  {/* Safety Score */}
                  <div>
                    <span className="block font-semibold text-zinc-800">
                      LVL {agent.safetyScore}
                    </span>
                    <span>Safety Score</span>
                  </div>

                  {/* Last Run */}
                  <div>
                    <span className="block font-semibold text-zinc-800">{agent.lastExecution}</span>
                    <span>Last Active</span>
                  </div>
                </div>

                {/* Footer Tools & Execute Button */}
                <div className="mt-6 flex justify-between items-center">
                  {/* Connected Integrations list */}
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] text-zinc-400">Tools:</span>
                    <div className="flex gap-1">
                      {agent.connectedTools.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-200/60 rounded text-[8px] font-medium text-zinc-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Play Button */}
                  <Button
                    size="sm"
                    onClick={() => handleRunAgent(agent)}
                    className="bg-zinc-950 text-white hover:bg-zinc-900 flex items-center gap-1.5 text-xs rounded-xl"
                  >
                    <Play className="size-3 fill-white" /> Run Agent
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Execution Drawer Output */}
      <Sheet open={runningAgent !== null} onOpenChange={(open) => !open && setRunningAgent(null)}>
        <SheetContent
          side="right"
          className="w-[450px] bg-zinc-950 border-l border-zinc-800 text-zinc-300 font-mono text-xs flex flex-col justify-between"
        >
          <div>
            <SheetHeader className="border-b border-zinc-800 pb-4 mb-4">
              <SheetTitle className="text-zinc-100 flex items-center gap-2">
                <Terminal className="size-5 text-violet-400" />
                <span>Execute: {runningAgent?.name}</span>
              </SheetTitle>
              <SheetDescription className="text-zinc-500">
                Live terminal console stream for simulated testing run.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-2 mt-6">
              {runLogs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-zinc-600">&gt;</span>
                  <span
                    className={cn(
                      log.includes("[SAFETY AUDIT]")
                        ? "text-amber-400 font-semibold"
                        : log.includes("completed")
                          ? "text-emerald-400 font-semibold"
                          : "",
                    )}
                  >
                    {log}
                  </span>
                </div>
              ))}
              {isRunning && (
                <div className="flex items-center gap-2 text-zinc-500 mt-4 animate-pulse">
                  <span className="size-2 rounded-full bg-violet-500 animate-ping" />
                  <span>Processing operational pipeline...</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 flex justify-between items-center text-[10px] text-zinc-500">
            <span>Client: AI-OS CLI v1.2</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-white"
              onClick={() => setRunningAgent(null)}
            >
              Close Session
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

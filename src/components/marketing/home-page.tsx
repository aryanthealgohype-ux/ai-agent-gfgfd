import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bot,
  ShieldCheck,
  Activity,
  Plug,
  Cpu,
  Sparkles,
  ArrowRight,
  Lock,
  Terminal,
  ShieldAlert,
  Play,
  Globe,
  Database,
  Search,
  CheckCircle2,
  Workflow,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const TRUSTED_COMPANIES = [
  { name: "Vercel", icon: Globe },
  { name: "Stripe", icon: Plug },
  { name: "OpenAI", icon: Sparkles },
  { name: "Supabase", icon: Database },
  { name: "GitHub", icon: Bot },
];

const FAQS = [
  {
    question: "What is an AI Operating System?",
    answer:
      "An AI Operating System (AI OS) is a unified command center designed to orchestrate, gate, and audit multiple specialized AI agents. It acts as an abstraction layer between models, credentials, and data sources.",
  },
  {
    question: "How do safety levels 1–5 work?",
    answer:
      "Each action performed by an agent gets scanned and rated. Level 1 actions are fully automated. Level 4 and 5 actions are high-risk (e.g., executing database write operations or moving funds) and are held in a secure approval queue until a human admin approves them.",
  },
  {
    question: "Can I connect my own APIs and models?",
    answer:
      "Yes, you can configure custom model connections (using OpenAI, Anthropic, Gemini, or self-hosted models) and authorize over 30 external connectors through credentials safely encrypted in the dashboard.",
  },
  {
    question: "Is there a local SDK or CLI?",
    answer:
      "Yes! Developers can interface with the agent fleet using our official TypeScript SDK or run agents locally through our Node.js CLI tool.",
  },
];

const INITIAL_LOGS = [
  "system_init.sh: Initializing AI Operating System Core v1.4.2...",
  "gateway: Connected to secure multi-tenant network.",
  "agent_fleet: Loaded 23 agent profiles successfully.",
  "reception_agent: Online. Listening for incoming user queries...",
  "security_auditor: Active. Real-time safety filters engaged.",
];

const MOCK_MESSAGES = [
  "reception_agent: Incoming task: 'Draft quarterly financial update'",
  "outreach_agent: Spawning sub-process to check pending client replies",
  "security_auditor: Audit warning: Action rated level 2 (low-risk) — Auto-approved",
  "finance_agent: Requesting invoice #4092 dispatch to accounting",
  "integrations: Stripe API connected. Latency: 42ms",
  "content_creator: Generated promotional copy. Tokens: 420. Cost: $0.0084",
  "security_auditor: GATED: Outbound transfer of $4,500 initiated by finance_agent. Safety level: 4.",
  "approval_queue: Task queued. Awaiting administrator sign-off.",
  "reception_agent: Process completed. Response delivered successfully.",
  "ops_scheduler: Synced database states. Zero errors detected.",
];

const MODEL_COMPARISON = [
  {
    model: "GPT Route",
    speed: "Fast",
    cost: "$$",
    context: "1M",
    best: "Reasoning and tool orchestration",
  },
  {
    model: "Claude Route",
    speed: "Medium",
    cost: "$$",
    context: "500k",
    best: "Long-form analysis and review",
  },
  {
    model: "Gemini Route",
    speed: "Fast",
    cost: "$",
    context: "2M",
    best: "Multimodal and research workflows",
  },
  {
    model: "Local Route",
    speed: "Variable",
    cost: "Fixed",
    context: "128k",
    best: "Private data and edge workloads",
  },
];

const HOME_EXPANSIONS = [
  {
    title: "AI Memory Engine",
    body: "Durable workspace memory stores user preferences, entity graphs, decisions, and reusable context with retention controls.",
    icon: Database,
    stats: "8.4M memory events",
  },
  {
    title: "Enterprise RAG",
    body: "Load PDFs, docs, tables, tickets, and wikis into governed vector indexes with source citations and access-aware retrieval.",
    icon: Search,
    stats: "96.7% answer traceability",
  },
  {
    title: "Multi-Agent Collaboration",
    body: "Assign agents to specialist roles, share working memory, escalate conflicts, and replay the full chain of reasoning artifacts.",
    icon: Bot,
    stats: "23 coordinated agents",
  },
  {
    title: "Security Overview",
    body: "Human approvals, RBAC maps, token limits, outbound action gates, signed logs, and risk scoring are built into every run.",
    icon: ShieldCheck,
    stats: "Zero-trust controls",
  },
];

const TESTIMONIALS = [
  {
    quote: "AI OS gave us the first agent platform our security team could actually approve.",
    name: "Maya Chen",
    role: "VP Platform, Northstar Bank",
  },
  {
    quote:
      "The command palette, approvals, and audit logs made agent rollout feel boring in the best possible way.",
    name: "Jon Bell",
    role: "Head of Automation, Orbit SaaS",
  },
  {
    quote:
      "We moved from experiments to governed workflows across support, finance, and ops in one quarter.",
    name: "Priya Rao",
    role: "COO, Helio Health",
  },
];

export function HomePage() {
  const [logs, setLogs] = useState<string[]>(INITIAL_LOGS);
  const [activeTab, setActiveTab] = useState<"agents" | "logs">("agents");
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomMsg = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLogs((prev) => [...prev.slice(-20), `[${timestamp}] ${randomMsg}`]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative grid lg:grid-cols-12 gap-12 py-20 sm:py-32 items-center max-w-6xl mx-auto px-6 z-10">
        {/* Left Column Content */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-600">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="size-2 absolute rounded-full bg-emerald-500" />
            <span className="ml-1 tracking-wide uppercase text-[10px]">
              Multi-Tenant Agent Fleet
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl leading-tight text-zinc-950">
            One command center for every{" "}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              AI agent
            </span>{" "}
            your business runs.
          </h1>

          {/* Description */}
          <p className="max-w-xl text-lg text-zinc-600 leading-relaxed">
            Provision isolated workspaces, seed production prompts instantly, and keep a human in
            the loop with strict safety controls.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-[0_4px_20px_rgba(124,58,237,0.25)] transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Link to="/auth" className="flex items-center gap-2">
                Create your workspace <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Link to="/auth">Explore Demo</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-8 border-t border-zinc-200/80 w-full max-w-lg text-zinc-500 text-sm">
            <div>
              <span className="block text-2xl font-bold text-zinc-950">23</span>
              <span>Active Agents</span>
            </div>
            <div className="border-l border-zinc-200/85 pl-8">
              <span className="block text-2xl font-bold text-zinc-950">99.98%</span>
              <span>Uptime SLA</span>
            </div>
            <div className="border-l border-zinc-200/85 pl-8">
              <span className="block text-2xl font-bold text-zinc-950">&lt; 150ms</span>
              <span>Decision Latency</span>
            </div>
          </div>
        </div>

        {/* Right Column Dashboard Console */}
        <div className="lg:col-span-5 w-full relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 opacity-15 blur-xl pointer-events-none" />

          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden text-zinc-300">
            {/* Console Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800/60">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-red-500/70" />
                <span className="size-3 rounded-full bg-yellow-500/70" />
                <span className="size-3 rounded-full bg-green-500/70" />
                <span className="ml-2 text-xs font-mono text-zinc-500">agent_fleet_status.sys</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("agents")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${activeTab === "agents" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  AGENTS
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${activeTab === "logs" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  LOGS
                </button>
              </div>
            </div>

            {/* Console Body */}
            <div
              className="p-5 min-h-[280px] max-h-[280px] overflow-y-auto font-mono text-xs text-zinc-300"
              ref={logContainerRef}
            >
              {activeTab === "agents" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Cpu className="size-4 text-violet-400" />
                      <div>
                        <p className="font-semibold text-zinc-200">reception_agent.py</p>
                        <p className="text-[10px] text-zinc-500">Route & intent recognition</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Sparkles className="size-4 text-indigo-400 animate-pulse" />
                      <div>
                        <p className="font-semibold text-zinc-200">outreach_writer.py</p>
                        <p className="text-[10px] text-zinc-500">Outbound email campaigns</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[10px] text-cyan-400 font-bold uppercase">Working</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Lock className="size-4 text-amber-400" />
                      <div>
                        <p className="font-semibold text-zinc-200">payout_scheduler.py</p>
                        <p className="text-[10px] text-zinc-500">Stripe transaction processor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <ShieldAlert className="size-3 text-amber-400" />
                      <span className="text-[9px] text-amber-400 font-bold uppercase ml-1">
                        Gated (LVL 4)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-zinc-600 select-none">&gt;</span>
                      <span
                        className={
                          log.includes("GATED")
                            ? "text-amber-400 font-semibold"
                            : log.includes("warning")
                              ? "text-yellow-300"
                              : ""
                        }
                      >
                        {log}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Console Footer */}
            <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Memory: 4.8 / 16 GB</span>
              <span>Region: us-east4</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted Logos Cloud */}
      <section className="py-8 border-y border-zinc-100 max-w-6xl mx-auto px-6 relative z-10 text-center">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">
          Orchestrating agents across leading platforms
        </p>
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
          {TRUSTED_COMPANIES.map((company) => (
            <div
              key={company.name}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <company.icon className="size-5" />
              <span className="font-extrabold tracking-tight text-sm">{company.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Split section */}
      <section className="py-20 sm:py-32 max-w-6xl mx-auto px-6 space-y-24">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950">
            Automate Workflows Safely
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Every agent connects to the models and APIs they need, audited by our Zero-Trust gateway
            and gated with manual approvals.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-zinc-200/80 bg-white/60 hover:bg-white hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-8 space-y-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                <Workflow className="size-5" />
              </span>
              <h3 className="text-lg font-bold text-zinc-950">Visual Workflow Graphs</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Connect triggers, filters, and AI agents on an animated drag-and-drop workflow graph
                canvas. Orchestrate multiple agents sequentially.
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200/80 bg-white/60 hover:bg-white hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-8 space-y-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Lock className="size-5" />
              </span>
              <h3 className="text-lg font-bold text-zinc-950">Human-In-The-Loop</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Gate high-risk operations automatically. Actions like database writes and fund
                transfers require explicit admin review before running.
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200/80 bg-white/60 hover:bg-white hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-8 space-y-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                <Terminal className="size-5" />
              </span>
              <h3 className="text-lg font-bold text-zinc-950">Real-Time Logs & Auditing</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Record latency, tokens consumed, and invoice cost per run in a cryptographically
                signed audit trail. Maintain total visibility.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Premium Expansion Sections */}
      <section className="relative border-t border-zinc-100 bg-zinc-50/70 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
                Full platform surface
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
                Everything required to operate AI at enterprise scale.
              </h2>
            </div>
            <p className="lg:col-span-5 text-sm leading-relaxed text-zinc-500">
              Route models, manage memory, govern retrieval, launch workflows, connect apps, and
              keep every action observable from the same premium workspace.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {HOME_EXPANSIONS.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/70"
              >
                <span className="flex size-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-extrabold text-zinc-950">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{feature.body}</p>
                <p className="mt-5 text-xs font-bold text-violet-700">{feature.stats}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Model Comparison and Workflow Preview */}
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-20 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                AI model comparison
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-zinc-950">
                Recommended routing matrix
              </h2>
            </div>
            <Button asChild variant="outline" className="border-zinc-200">
              <Link to="/models">Open models</Link>
            </Button>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
            {MODEL_COMPARISON.map((row) => (
              <div
                key={row.model}
                className="grid grid-cols-5 gap-3 border-b border-zinc-100 p-4 text-xs last:border-b-0"
              >
                <span className="font-bold text-zinc-950">{row.model}</span>
                <span className="text-zinc-500">{row.speed}</span>
                <span className="text-zinc-500">{row.cost}</span>
                <span className="text-zinc-500">{row.context}</span>
                <span className="text-zinc-600">{row.best}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Live workflow animation</h2>
            <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
              RUNNING
            </span>
          </div>
          <div className="mt-7 space-y-4">
            {["Trigger", "RAG Lookup", "Model Route", "Approval Gate", "Webhook"].map(
              (step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-cyan-300">
                    {index + 1}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                      initial={{ width: "10%" }}
                      animate={{ width: `${35 + index * 13}%` }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                    />
                  </div>
                  <span className="w-24 text-xs font-semibold text-zinc-300">{step}</span>
                </div>
              ),
            )}
          </div>
          <Button asChild className="mt-8 w-full bg-white text-zinc-950 hover:bg-zinc-200">
            <Link to="/workflows">Build workflow</Link>
          </Button>
        </div>
      </section>

      {/* Integrations, API, Search, Releases */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Interactive Integrations",
              href: "/apps",
              icon: Plug,
              body: "Connect Google, Slack, GitHub, Stripe, Vercel, Supabase, AWS, and more with scoped permissions.",
            },
            {
              title: "Developer API Preview",
              href: "/developers",
              icon: Terminal,
              body: "Copy SDK snippets, simulate webhooks, and inspect request payloads before you ship.",
            },
            {
              title: "Global Search Preview",
              href: "/docs",
              icon: Search,
              body: "Search docs, workflows, agents, templates, models, and audit events from a single command surface.",
            },
            {
              title: "Latest Releases",
              href: "/releases",
              icon: Sparkles,
              body: "Track new features, fixes, performance improvements, security updates, and upcoming roadmap links.",
            },
          ].map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/70"
            >
              <item.icon className="size-6 text-zinc-950" />
              <h3 className="mt-5 text-base font-extrabold text-zinc-950">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.body}</p>
              <span className="mt-5 inline-flex items-center text-xs font-bold text-violet-700">
                Explore <ArrowRight className="ml-1 size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials and Enterprise CTA */}
      <section className="border-y border-zinc-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <div key={item.name} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-6">
                <p className="text-sm leading-relaxed text-zinc-700">"{item.quote}"</p>
                <div className="mt-5 border-t border-zinc-200 pt-4">
                  <p className="text-sm font-extrabold text-zinc-950">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl bg-zinc-950 p-8 text-white sm:p-10">
            <div className="grid gap-8 md:grid-cols-3 md:items-center">
              <div className="md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                  Enterprise CTA
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                  Launch governed AI agents across every department.
                </h2>
              </div>
              <Button asChild size="lg" className="bg-white text-zinc-950 hover:bg-zinc-200">
                <Link to="/enterprise">Plan enterprise rollout</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-20 sm:py-32 max-w-4xl mx-auto px-6 border-t border-zinc-100">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 text-center mb-12">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`} className="border-zinc-200">
              <AccordionTrigger className="text-zinc-950 font-bold hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-zinc-500 text-sm leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-zinc-950 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vh] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

        <div className="max-w-3xl mx-auto px-6 space-y-6 relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Ready to provision your agent fleet?
          </h2>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Join innovative engineering teams using the AI Operating System to govern LLM
            orchestration safely.
          </p>
          <div className="pt-2">
            <Button
              asChild
              size="lg"
              className="bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-lg"
            >
              <Link to="/auth">Get Started Instantly</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

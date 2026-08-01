import React, { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Database,
  FileCode2,
  Gauge,
  GraduationCap,
  Heart,
  History,
  Image,
  Layers3,
  LockKeyhole,
  MessageSquare,
  Mic,
  Network,
  PackageCheck,
  Play,
  Plug,
  Rocket,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type PremiumPageKey =
  | "blog"
  | "careers"
  | "about"
  | "contact"
  | "changelog"
  | "roadmap"
  | "docs"
  | "community"
  | "status"
  | "models"
  | "studio"
  | "playground"
  | "templates"
  | "apps"
  | "customers"
  | "compare"
  | "trust"
  | "academy"
  | "releases";

type IconType = React.ComponentType<{ className?: string }>;

type PageSpec = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  icon: IconType;
  metrics: string[];
  highlights: string[];
  tabs: string[];
  cards: Array<{ title: string; body: string; icon: IconType; meta: string }>;
};

const iconPool = [
  Bot,
  Workflow,
  ShieldCheck,
  Database,
  Plug,
  Cpu,
  Sparkles,
  Network,
  Terminal,
  Gauge,
];

const createCards = (items: string[], page: string) =>
  items.map((item, index) => {
    const Icon = iconPool[index % iconPool.length] ?? Sparkles;
    return {
      title: item,
      body: `${item} is modeled as a production-ready ${page.toLowerCase()} capability with status, permissions, audit trail, and guided setup flows.`,
      icon: Icon,
      meta: index % 3 === 0 ? "Recommended" : index % 3 === 1 ? "Live" : "Configurable",
    };
  });

const PAGE_SPECS: Record<PremiumPageKey, PageSpec> = {
  blog: {
    eyebrow: "AI Engineering Journal",
    title: "Field notes for teams shipping agentic systems",
    description:
      "A polished editorial hub for release analysis, tutorials, architecture notes, and practical AI operations playbooks.",
    primaryCta: "Read featured post",
    secondaryCta: "Browse tutorials",
    icon: BookOpen,
    metrics: ["42 articles", "8 collections", "Weekly drops"],
    highlights: [
      "Engineering deep dives",
      "Founder essays",
      "Release tutorials",
      "Customer playbooks",
    ],
    tabs: ["Featured", "Engineering", "Tutorials"],
    cards: createCards(
      [
        "Agent orchestration",
        "RAG evaluation",
        "Prompt versioning",
        "Cost governance",
        "Human approvals",
        "Model routing",
      ],
      "Blog",
    ),
  },
  careers: {
    eyebrow: "Careers",
    title: "Build the operating layer for safe enterprise AI",
    description:
      "A premium recruiting page with role cards, hiring stages, culture principles, and an application dialog-inspired flow.",
    primaryCta: "View open roles",
    secondaryCta: "Meet the team",
    icon: Building2,
    metrics: ["Remote-first", "9 open roles", "4 teams hiring"],
    highlights: ["Product engineering", "AI safety", "Developer experience", "Enterprise success"],
    tabs: ["Engineering", "Design", "GTM"],
    cards: createCards(
      [
        "Staff product engineer",
        "AI safety researcher",
        "Design systems lead",
        "Solutions architect",
        "Developer advocate",
        "Customer engineer",
      ],
      "Careers",
    ),
  },
  about: {
    eyebrow: "About AI OS",
    title: "A company built around trustworthy autonomy",
    description:
      "Company story, mission values, operating principles, founder profiles, and a visual timeline for enterprise buyers.",
    primaryCta: "Our mission",
    secondaryCta: "Contact founders",
    icon: Heart,
    metrics: ["2026 launch", "SOC2 track", "Global team"],
    highlights: ["Human control", "Visible automation", "Open ecosystem", "Measured reliability"],
    tabs: ["Mission", "Timeline", "Values"],
    cards: createCards(
      [
        "Founded from workflow pain",
        "First gated agent fleet",
        "Enterprise security review",
        "Marketplace launch",
        "Global partner program",
        "Responsible AI council",
      ],
      "About",
    ),
  },
  contact: {
    eyebrow: "Contact",
    title: "Talk with an AI operations specialist",
    description:
      "Sales, support, partnerships, and demo scheduling in one calm enterprise-grade contact experience.",
    primaryCta: "Schedule demo",
    secondaryCta: "Open live chat",
    icon: MessageSquare,
    metrics: ["24h response", "Global coverage", "Solution architects"],
    highlights: ["Demo calendar", "Live support", "Partner desk", "Security questions"],
    tabs: ["Sales", "Support", "Partners"],
    cards: createCards(
      [
        "Enterprise demo",
        "Technical support",
        "Security review",
        "Partner program",
        "Migration planning",
        "Custom pricing",
      ],
      "Contact",
    ),
  },
  changelog: {
    eyebrow: "Changelog",
    title: "Every product improvement in one elegant timeline",
    description:
      "Chronological product updates with visual release cards, bug fixes, performance changes, and security notes.",
    primaryCta: "Subscribe to updates",
    secondaryCta: "Open roadmap",
    icon: History,
    metrics: ["v1.4 current", "37 updates", "Weekly cadence"],
    highlights: ["New features", "Fixes", "Performance", "Security"],
    tabs: ["v1.4", "v1.3", "v1.2"],
    cards: createCards(
      [
        "Model router rules",
        "Approval queue filters",
        "Vector index explorer",
        "Webhook retries",
        "Cost alerts",
        "Audit export",
      ],
      "Changelog",
    ),
  },
  roadmap: {
    eyebrow: "Roadmap",
    title: "A transparent delivery plan for the AI OS platform",
    description:
      "A Gantt-style roadmap page for planned, in-progress, and shipped capabilities across the product surface.",
    primaryCta: "Request feature",
    secondaryCta: "See releases",
    icon: Rocket,
    metrics: ["18 planned", "7 building", "12 shipped"],
    highlights: ["Planning", "In progress", "Beta", "Released"],
    tabs: ["Now", "Next", "Later"],
    cards: createCards(
      [
        "Native voice agents",
        "On-prem runner",
        "Fine-grained RBAC",
        "Agent replay debugger",
        "Private marketplace",
        "Data residency",
      ],
      "Roadmap",
    ),
  },
  docs: {
    eyebrow: "Documentation",
    title: "Reference-quality docs for builders and operators",
    description:
      "Searchable docs layout with quickstarts, copyable snippets, API reference cards, and webhook delivery guides.",
    primaryCta: "Start quickstart",
    secondaryCta: "API reference",
    icon: FileCode2,
    metrics: ["120 guides", "SDK snippets", "Webhook labs"],
    highlights: ["Quickstarts", "API keys", "Webhooks", "Policy engine"],
    tabs: ["Guides", "API", "SDK"],
    cards: createCards(
      [
        "Create an agent",
        "Route model traffic",
        "Register a tool",
        "Handle approvals",
        "Stream run logs",
        "Export audits",
      ],
      "Documentation",
    ),
  },
  community: {
    eyebrow: "Community",
    title: "A social hub for AI operators and builders",
    description:
      "Contributor leaderboards, events, office hours, ambassadors, and shared automation examples.",
    primaryCta: "Join community",
    secondaryCta: "See events",
    icon: Star,
    metrics: ["18k members", "420 templates", "34 events"],
    highlights: ["Leaderboards", "Events", "Ambassadors", "Examples"],
    tabs: ["Leaders", "Events", "Examples"],
    cards: createCards(
      [
        "Template champion",
        "Security mentor",
        "Workflow clinic",
        "AI ops meetup",
        "Ambassador cohort",
        "Open-source examples",
      ],
      "Community",
    ),
  },
  status: {
    eyebrow: "System Status",
    title: "Live reliability signals across the platform",
    description:
      "Operational indicators for database, API, model gateway, webhook workers, and the global agent fleet.",
    primaryCta: "Subscribe",
    secondaryCta: "Incident history",
    icon: Gauge,
    metrics: ["99.98% uptime", "42ms API p50", "0 active incidents"],
    highlights: ["Database", "API", "Agent fleet", "Webhooks"],
    tabs: ["Current", "History", "Regions"],
    cards: createCards(
      [
        "Core API",
        "Model gateway",
        "Agent fleet",
        "Vector database",
        "Webhook workers",
        "Dashboard app",
      ],
      "Status",
    ),
  },
  models: {
    eyebrow: "AI Models",
    title: "Compare every model your agents can route to",
    description:
      "GPT, Claude, Gemini, Grok, OpenRouter, Ollama, DeepSeek, and Mistral models with speed, cost, context, benchmarks, and live availability.",
    primaryCta: "Compare models",
    secondaryCta: "Open router",
    icon: BrainCircuit,
    metrics: ["8 providers", "1M context max", "Live routing"],
    highlights: [
      "GPT Models",
      "Claude Models",
      "Gemini Models",
      "Grok Models",
      "OpenRouter Models",
      "Ollama Models",
      "DeepSeek Models",
      "Mistral Models",
    ],
    tabs: ["Recommended", "Fastest", "Lowest cost"],
    cards: createCards(
      [
        "GPT-5 class reasoning",
        "Claude long-form analysis",
        "Gemini multimodal",
        "Grok social context",
        "OpenRouter fallback",
        "Ollama private runner",
        "DeepSeek coding",
        "Mistral efficient ops",
      ],
      "AI Models",
    ),
  },
  studio: {
    eyebrow: "AI Studio",
    title: "Design agents, prompts, memory, tools, and workflows visually",
    description:
      "A builder-style studio with agent builder, prompt builder, workflow builder, memory builder, tool builder, and visual builder panels.",
    primaryCta: "Open studio",
    secondaryCta: "Preview builder",
    icon: Layers3,
    metrics: ["6 builders", "Live preview", "Versioned"],
    highlights: [
      "Agent Builder",
      "Prompt Builder",
      "Workflow Builder",
      "Memory Builder",
      "Tool Builder",
      "Visual Builder",
    ],
    tabs: ["Agents", "Prompts", "Tools"],
    cards: createCards(
      [
        "Agent Builder",
        "Prompt Builder",
        "Workflow Builder",
        "Memory Builder",
        "Tool Builder",
        "Visual Builder",
      ],
      "AI Studio",
    ),
  },
  playground: {
    eyebrow: "AI Playground",
    title: "Test chat, vision, images, voice, documents, code, and prompts",
    description:
      "An interactive playground surface with model selector, temperature, max tokens, streaming, export, and history controls.",
    primaryCta: "Run prompt",
    secondaryCta: "Export session",
    icon: Play,
    metrics: ["7 modes", "Streaming", "Session history"],
    highlights: [
      "Chat",
      "Vision",
      "Image Generation",
      "Voice",
      "Documents",
      "Code",
      "Prompt Testing",
    ],
    tabs: ["Chat", "Vision", "Code"],
    cards: createCards(
      [
        "Chat mode",
        "Vision analysis",
        "Image generation",
        "Voice turn",
        "Document QA",
        "Code repair",
        "Prompt testing",
      ],
      "Playground",
    ),
  },
  templates: {
    eyebrow: "Templates Library",
    title: "Install production workflows by team and use case",
    description:
      "A professional template marketplace with search, categories, install, preview, favorites, and team-based collections.",
    primaryCta: "Install template",
    secondaryCta: "Preview library",
    icon: PackageCheck,
    metrics: ["220 templates", "8 categories", "One-click install"],
    highlights: [
      "Sales",
      "Marketing",
      "HR",
      "Finance",
      "Legal",
      "Customer Support",
      "Automation",
      "AI Agents",
    ],
    tabs: ["Popular", "Teams", "Favorites"],
    cards: createCards(
      [
        "Sales",
        "Marketing",
        "HR",
        "Finance",
        "Legal",
        "Customer Support",
        "Automation",
        "AI Agents",
      ],
      "Templates",
    ),
  },
  apps: {
    eyebrow: "Apps Marketplace",
    title: "Connect every tool your business already uses",
    description:
      "A modern integrations marketplace with logos, status, descriptions, connect buttons, permissions, and documentation links.",
    primaryCta: "Connect app",
    secondaryCta: "View permissions",
    icon: Plug,
    metrics: ["22 featured apps", "OAuth ready", "Scoped access"],
    highlights: [
      "Google",
      "Slack",
      "Discord",
      "Telegram",
      "WhatsApp",
      "GitHub",
      "GitLab",
      "Notion",
      "Airtable",
      "HubSpot",
      "Salesforce",
      "Zapier",
      "Make",
      "n8n",
      "Stripe",
      "PayPal",
      "Vercel",
      "Supabase",
      "Postgres",
      "Cloudflare",
      "AWS",
      "Azure",
    ],
    tabs: ["Popular", "Data", "Revenue"],
    cards: createCards(
      [
        "Google",
        "Slack",
        "Discord",
        "Telegram",
        "WhatsApp",
        "GitHub",
        "GitLab",
        "Notion",
        "Airtable",
        "HubSpot",
        "Salesforce",
        "Zapier",
        "Make",
        "n8n",
        "Stripe",
        "PayPal",
        "Vercel",
        "Supabase",
        "Postgres",
        "Cloudflare",
        "AWS",
        "Azure",
      ],
      "Apps",
    ),
  },
  customers: {
    eyebrow: "Customers",
    title: "Enterprise AI teams prove ROI with safer automation",
    description:
      "Customer stories, case studies, ROI calculator, testimonials, success metrics, logos, and before-after results.",
    primaryCta: "Read stories",
    secondaryCta: "Calculate ROI",
    icon: BarChart3,
    metrics: ["38% cost down", "7.4x ROI", "92% faster triage"],
    highlights: [
      "Customer Stories",
      "Case Studies",
      "ROI Calculator",
      "Testimonials",
      "Success Metrics",
      "Company Logos",
      "Before / After Results",
    ],
    tabs: ["Stories", "ROI", "Metrics"],
    cards: createCards(
      [
        "Northstar Bank",
        "Helio Health",
        "Orbit SaaS",
        "Atlas Retail",
        "Pioneer Legal",
        "Signal Cloud",
      ],
      "Customers",
    ),
  },
  compare: {
    eyebrow: "Compare",
    title: "See how AI OS stacks up against automation and AI platforms",
    description:
      "Compare AI OS against OpenAI, CrewAI, LangGraph, Zapier, Make, n8n, Microsoft Copilot, and Google Vertex AI.",
    primaryCta: "Compare platforms",
    secondaryCta: "Talk to sales",
    icon: Boxes,
    metrics: ["8 comparisons", "Enterprise matrix", "Security scored"],
    highlights: [
      "OpenAI",
      "CrewAI",
      "LangGraph",
      "Zapier",
      "Make",
      "n8n",
      "Microsoft Copilot",
      "Google Vertex AI",
    ],
    tabs: ["Features", "Security", "Pricing"],
    cards: createCards(
      [
        "OpenAI",
        "CrewAI",
        "LangGraph",
        "Zapier",
        "Make",
        "n8n",
        "Microsoft Copilot",
        "Google Vertex AI",
      ],
      "Compare",
    ),
  },
  trust: {
    eyebrow: "Trust Center",
    title: "Security, privacy, compliance, and responsible AI in one place",
    description:
      "Trust center for SOC2, GDPR, HIPAA, ISO27001, security architecture, encryption, audit logs, responsible AI, bug bounty, and pen testing.",
    primaryCta: "Visit trust center",
    secondaryCta: "Request packet",
    icon: LockKeyhole,
    metrics: ["SOC2 ready", "Zero-trust", "Encrypted"],
    highlights: [
      "SOC2",
      "GDPR",
      "HIPAA",
      "ISO27001",
      "Security Architecture",
      "Privacy",
      "Encryption",
      "Audit Logs",
      "Compliance",
      "Responsible AI",
      "Bug Bounty",
      "Pen Testing",
    ],
    tabs: ["Compliance", "Security", "Privacy"],
    cards: createCards(
      [
        "SOC2",
        "GDPR",
        "HIPAA",
        "ISO27001",
        "Security Architecture",
        "Privacy",
        "Encryption",
        "Audit Logs",
        "Responsible AI",
        "Bug Bounty",
        "Pen Testing",
      ],
      "Trust Center",
    ),
  },
  academy: {
    eyebrow: "AI Academy",
    title: "Learn to design, evaluate, and operate AI agents",
    description:
      "A learning portal with courses, tutorials, documentation, videos, certifications, paths, examples, and downloads.",
    primaryCta: "Start learning",
    secondaryCta: "View paths",
    icon: GraduationCap,
    metrics: ["12 courses", "5 certificates", "80 examples"],
    highlights: [
      "Courses",
      "Tutorials",
      "Documentation",
      "Videos",
      "Certifications",
      "Learning Paths",
      "Examples",
      "Downloads",
    ],
    tabs: ["Courses", "Paths", "Examples"],
    cards: createCards(
      [
        "Agent fundamentals",
        "Prompt testing",
        "RAG operations",
        "Tool safety",
        "Workflow design",
        "Cost controls",
        "Enterprise rollout",
        "Certification prep",
      ],
      "AI Academy",
    ),
  },
  releases: {
    eyebrow: "Releases",
    title: "Release notes built for product teams and operators",
    description:
      "Modern release notes with version history, new features, bug fixes, performance improvements, security updates, upcoming features, and roadmap links.",
    primaryCta: "Follow releases",
    secondaryCta: "Open roadmap",
    icon: Rocket,
    metrics: ["v1.4.2 latest", "Security notes", "Roadmap linked"],
    highlights: [
      "Version History",
      "New Features",
      "Bug Fixes",
      "Performance Improvements",
      "Security Updates",
      "Upcoming Features",
      "Roadmap Links",
    ],
    tabs: ["Latest", "Security", "Upcoming"],
    cards: createCards(
      [
        "v1.4.2 agent telemetry",
        "v1.4 approval inbox",
        "v1.3 marketplace",
        "v1.3.1 bug fixes",
        "Performance routing",
        "Security hardening",
        "Upcoming studio",
      ],
      "Releases",
    ),
  },
};

export function PremiumMarketingPage({ pageKey }: { pageKey: PremiumPageKey }) {
  const page = PAGE_SPECS[pageKey];
  const [query, setQuery] = useState("");
  const [volume, setVolume] = useState([42]);
  const [streaming, setStreaming] = useState(true);

  const filteredCards = useMemo(() => {
    if (!query.trim()) return page.cards;
    return page.cards.filter((card) => card.title.toLowerCase().includes(query.toLowerCase()));
  }, [page.cards, query]);

  const Icon = page.icon;
  const projectedValue = (volume[0] ?? 42) * 128;

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern-light opacity-70 pointer-events-none" />
      <div className="absolute -top-32 left-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute top-96 -right-28 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <section className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-sm backdrop-blur">
            <Icon className="size-3.5 text-violet-600" />
            {page.eyebrow}
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-6xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            {page.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              className="bg-zinc-950 text-white hover:bg-zinc-800"
              size="lg"
              onClick={() => toast.success(`${page.primaryCta} is ready in the demo workspace`)}
            >
              {page.primaryCta}
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button asChild variant="outline" size="lg" className="border-zinc-200 bg-white/80">
              <Link to="/contact">{page.secondaryCta}</Link>
            </Button>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {page.metrics.map((metric) => (
              <div
                key={metric}
                className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur"
              >
                <p className="text-sm font-extrabold text-zinc-950">{metric}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400">
                  Live signal
                </p>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-5"
        >
          <div className="rounded-[2rem] border border-zinc-200 bg-white/75 p-4 shadow-2xl shadow-zinc-200/70 backdrop-blur-xl">
            <div className="rounded-3xl bg-zinc-950 p-5 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="size-5 text-cyan-300" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{page.eyebrow}</p>
                    <p className="text-[10px] text-zinc-400">Premium control plane</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                  LIVE
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {page.highlights.slice(0, 5).map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-[11px] font-bold text-zinc-300">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">{item}</span>
                    </div>
                    <CheckCircle2 className="size-4 text-emerald-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-zinc-200 bg-white/75 shadow-sm backdrop-blur lg:col-span-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-zinc-950">Control Set</h2>
                <SlidersHorizontal className="size-5 text-zinc-400" />
              </div>
              <div className="mt-6 space-y-5">
                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-500">
                    <span>Agent volume</span>
                    <span>{volume[0]}k runs</span>
                  </div>
                  <Slider value={volume} min={10} max={100} step={1} onValueChange={setVolume} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-zinc-950">Streaming</p>
                    <p className="text-xs text-zinc-500">Live execution output</p>
                  </div>
                  <Switch checked={streaming} onCheckedChange={setStreaming} />
                </div>
                <div className="rounded-2xl bg-zinc-950 p-4 text-white">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Projected monthly value
                  </p>
                  <p className="mt-1 text-3xl font-extrabold">${projectedValue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs defaultValue={page.tabs[0]} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3 bg-zinc-100 sm:w-[360px]">
                  {page.tabs.map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="text-xs">
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {page.tabs.map((tab) => (
                  <TabsContent key={tab} value={tab} className="sr-only">
                    {tab}
                  </TabsContent>
                ))}
              </Tabs>
              <div className="relative sm:w-72">
                <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search this page..."
                  className="border-zinc-200 bg-white/80 pl-9 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredCards.map((card, index) => {
                const CardIcon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.03 }}
                    className="group rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800">
                        <CardIcon className="size-5" />
                      </span>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                        {card.meta}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-extrabold text-zinc-950">{card.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500">{card.body}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-200 bg-white"
                        onClick={() =>
                          toast.success(`${card.title} added to your workspace preview`)
                        }
                      >
                        <Zap className="mr-1.5 size-3.5" />
                        Install
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-500 hover:text-zinc-950"
                      >
                        Details
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-zinc-200 bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3 md:items-center">
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">
              Production ready
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Bring {page.eyebrow.toLowerCase()} into your AI operating layer.
            </h2>
          </div>
          <Button asChild size="lg" className="bg-white text-zinc-950 hover:bg-zinc-200">
            <Link to="/auth">
              Create workspace
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

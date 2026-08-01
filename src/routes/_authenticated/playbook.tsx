import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Search, ChevronDown } from "lucide-react";
import { listAgents } from "@/lib/fleet.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SafetyBadge } from "@/components/safety-badge";

export const Route = createFileRoute("/_authenticated/playbook")({
  head: () => ({
    meta: [
      { title: "Safety Playbook | AI Operating System" },
      {
        name: "description",
        content:
          "Review and export every AI agent's safety-rated system prompt, role definition, permissions and escalation rules as JSON, Markdown or CSV.",
      },
      { property: "og:title", content: "Safety Playbook | AI Operating System" },
      {
        property: "og:description",
        content:
          "Review and export every agent's safety-rated system prompt and role definition in one audit-ready document.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaybookPage,
});

type Agent = {
  id: string;
  slug: string;
  name: string;
  category: string;
  safety_rating: number;
  safety_justification: string;
  permissions: string[];
  escalation_rules: string | null;
  required_connectors: string[];
  system_prompt: string;
  model: string;
  status: string;
  requires_approval: boolean;
  version: number;
};

function download(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(agents: Agent[]) {
  const lines = [
    "# AI Agent Safety Playbook",
    "",
    `Exported ${new Date().toISOString()} · ${agents.length} agents`,
    "",
    "| Agent | Category | Safety | Approval | Model |",
    "| --- | --- | --- | --- | --- |",
    ...agents.map(
      (a) =>
        `| ${a.name} | ${a.category} | ${a.safety_rating}/5 | ${a.requires_approval ? "required" : "autonomous"} | ${a.model} |`,
    ),
    "",
  ];
  for (const a of agents) {
    lines.push(
      `## ${a.name} (\`${a.slug}\`) — safety ${a.safety_rating}/5`,
      "",
      `- **Category:** ${a.category}`,
      `- **Model:** ${a.model}`,
      `- **Version:** v${a.version} · **Status:** ${a.status}`,
      `- **Human approval:** ${a.requires_approval ? "required before every run" : "not required"}`,
      `- **Permissions:** ${a.permissions.join(", ") || "none"}`,
      `- **Required connectors:** ${a.required_connectors.join(", ") || "none"}`,
      "",
      `**Why this rating:** ${a.safety_justification}`,
      "",
      `**Escalation rules:** ${a.escalation_rules ?? "none defined"}`,
      "",
      "**System prompt:**",
      "",
      "```text",
      a.system_prompt,
      "```",
      "",
    );
  }
  return lines.join("\n");
}

function toCsv(agents: Agent[]) {
  const esc = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = [
    "slug",
    "name",
    "category",
    "safety_rating",
    "requires_approval",
    "model",
    "version",
    "status",
    "permissions",
    "required_connectors",
    "safety_justification",
    "escalation_rules",
    "system_prompt",
  ];
  return [
    header.join(","),
    ...agents.map((a) =>
      [
        a.slug,
        a.name,
        a.category,
        a.safety_rating,
        a.requires_approval,
        a.model,
        a.version,
        a.status,
        a.permissions.join(" | "),
        a.required_connectors.join(" | "),
        a.safety_justification,
        a.escalation_rules ?? "",
        a.system_prompt,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}

function PlaybookPage() {
  const fetchAgents = useServerFn(listAgents);
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => fetchAgents(),
  });

  const [term, setTerm] = useState("");
  const [minSafety, setMinSafety] = useState(1);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return (agents as Agent[])
      .filter((a) => a.safety_rating >= minSafety)
      .filter(
        (a) =>
          !needle ||
          a.name.toLowerCase().includes(needle) ||
          a.category.toLowerCase().includes(needle) ||
          a.system_prompt.toLowerCase().includes(needle),
      );
  }, [agents, term, minSafety]);

  const stamp = new Date().toISOString().slice(0, 10);

  function exportAs(format: "json" | "md" | "csv") {
    if (!filtered.length) {
      toast.error("Nothing to export with the current filters.");
      return;
    }
    if (format === "json") {
      download(
        `agent-safety-playbook-${stamp}.json`,
        "application/json",
        JSON.stringify(
          { exported_at: new Date().toISOString(), agent_count: filtered.length, agents: filtered },
          null,
          2,
        ),
      );
    } else if (format === "md") {
      download(`agent-safety-playbook-${stamp}.md`, "text/markdown", toMarkdown(filtered));
    } else {
      download(`agent-safety-playbook-${stamp}.csv`, "text/csv", toCsv(filtered));
    }
    toast.success(`Exported ${filtered.length} agent definitions`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Safety playbook
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every agent's role definition, safety rating and full system prompt — reviewable here,
            exportable for audit.
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search agents, categories or prompt text…"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={minSafety === level ? "default" : "outline"}
                  onClick={() => setMinSafety(level)}
                >
                  {level}+
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => exportAs("md")}>
              <Download className="size-4" /> Markdown
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportAs("json")}>
              <Download className="size-4" /> JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportAs("csv")}>
              <Download className="size-4" /> CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              {filtered.length} of {agents.length} agents
            </span>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading agent definitions…</p>}

      <div className="space-y-2">
        {filtered.map((agent) => {
          const expanded = Boolean(open[agent.id]);
          return (
            <Card key={agent.id}>
              <CardContent className="space-y-3 p-4">
                <button
                  type="button"
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
                  onClick={() => setOpen((prev) => ({ ...prev, [agent.id]: !expanded }))}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {agent.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <SafetyBadge rating={agent.safety_rating} />
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {agent.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {agent.requires_approval ? "approval gated" : "autonomous"}
                      </Badge>
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-border pt-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">Why this rating</p>
                      <p className="mt-1 text-muted-foreground">{agent.safety_justification}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="font-medium text-foreground">Permissions</p>
                        <p className="mt-1 text-muted-foreground">
                          {agent.permissions.join(", ") || "none"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Required connectors</p>
                        <p className="mt-1 text-muted-foreground">
                          {agent.required_connectors.join(", ") || "none"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Escalation rules</p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {agent.escalation_rules ?? "none defined"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        System prompt · {agent.model} · v{agent.version}
                      </p>
                      <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px] whitespace-pre-wrap text-foreground">
                        {agent.system_prompt}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

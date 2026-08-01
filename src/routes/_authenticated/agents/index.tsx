import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listAgents } from "@/lib/fleet.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SafetyBadge, StatusBadge } from "@/components/safety-badge";

export const Route = createFileRoute("/_authenticated/agents/")({
  head: () => ({
    meta: [
      { title: "Agent Fleet | AI Operating System" },
      {
        name: "description",
        content:
          "Browse all 23 specialised AI agents by category, safety rating and status, then run or configure any of them.",
      },
      { property: "og:title", content: "Agent Fleet | AI Operating System" },
      {
        property: "og:description",
        content: "Browse all specialised AI agents by category, safety rating and status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const fetchAgents = useServerFn(listAgents);
  const { data: agents = [], isLoading } = useQuery({ queryKey: ["agents"], queryFn: () => fetchAgents() });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(agents.map((a) => a.category)))],
    [agents],
  );

  const filtered = agents.filter((agent) => {
    const matchesCategory = category === "all" || agent.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || agent.name.toLowerCase().includes(q) || agent.category.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agent fleet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {agents.length} specialised agents. High-risk agents are approval-gated and cannot be run
          without a human decision.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search agents…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {categories.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={category === item ? "default" : "outline"}
              onClick={() => setCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading fleet…</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((agent) => (
          <Link key={agent.id} to="/agents/$slug" params={{ slug: agent.slug }}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{agent.name}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {agent.category}
                    </p>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {agent.safety_justification}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <SafetyBadge rating={agent.safety_rating} />
                  <span className="font-mono text-[11px] text-muted-foreground">{agent.model}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!isLoading && !filtered.length && (
        <p className="text-sm text-muted-foreground">No agents match that filter.</p>
      )}
    </div>
  );
}

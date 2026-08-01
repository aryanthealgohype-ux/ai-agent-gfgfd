import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, ShieldCheck, Activity, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Operating System — Agent Fleet Command Center" },
      {
        name: "description",
        content:
          "Run, gate and audit a fleet of 23 specialised AI agents from one multi-tenant command center with human approval on every high-risk action.",
      },
      { property: "og:title", content: "AI Operating System — Agent Fleet Command Center" },
      {
        property: "og:description",
        content:
          "Run, gate and audit 23 specialised AI agents with human approval on every high-risk action.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Bot,
    title: "23 specialised agents",
    body: "Reception, outreach, content, ops and finance agents, each with its own prompt, model and version history.",
  },
  {
    icon: ShieldCheck,
    title: "Safety ratings 1–5",
    body: "Anything rated 4 or above is hard-gated: the run waits in the approval queue and cannot execute without a human decision.",
  },
  {
    icon: Activity,
    title: "Every run accounted for",
    body: "Status, latency, tokens and cost recorded per execution, with a streaming log and an immutable audit trail.",
  },
  {
    icon: Plug,
    title: "Connector aware",
    body: "Each agent declares the integrations it needs, so you can see exactly what's wired up before you run it.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </span>
          <span className="font-semibold text-foreground">AI Operating System</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-16 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Multi-tenant agent fleet
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            One command center for every AI agent your business runs.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Provision an isolated workspace, get all 23 agents seeded with production prompts, and
            keep a human in the loop wherever the risk is real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Create your workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="space-y-3 p-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </span>
                <h2 className="text-lg font-semibold text-foreground">{feature.title}</h2>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

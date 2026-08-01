import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { HomePage } from "@/components/marketing/home-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Operating System - Agent Fleet Command Center" },
      {
        name: "description",
        content:
          "Run, gate, audit, and scale enterprise AI agents, model routing, workflows, RAG, integrations, analytics, and security from one premium operating layer.",
      },
      { property: "og:title", content: "AI Operating System - Agent Fleet Command Center" },
      {
        property: "og:description",
        content:
          "Run, gate, audit, and scale enterprise AI agents, model routing, workflows, RAG, integrations, analytics, and security from one premium operating layer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <MarketingLayout>
      <HomePage />
    </MarketingLayout>
  ),
});

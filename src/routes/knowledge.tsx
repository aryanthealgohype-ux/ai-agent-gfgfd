import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { KnowledgePage } from "@/components/marketing/knowledge-page";

export const Route = createFileRoute("/knowledge")({
  component: () => (
    <MarketingLayout>
      <KnowledgePage />
    </MarketingLayout>
  ),
});

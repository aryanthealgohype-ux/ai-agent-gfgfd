import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { AgentsPage } from "@/components/marketing/agents-page";

export const Route = createFileRoute("/agents")({
  component: () => (
    <MarketingLayout>
      <AgentsPage />
    </MarketingLayout>
  ),
});

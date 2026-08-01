import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { WorkflowsPage } from "@/components/marketing/workflows-page";

export const Route = createFileRoute("/workflows")({
  component: () => (
    <MarketingLayout>
      <WorkflowsPage />
    </MarketingLayout>
  ),
});

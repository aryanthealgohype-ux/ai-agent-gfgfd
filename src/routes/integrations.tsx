import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { IntegrationsPage } from "@/components/marketing/integrations-page";

export const Route = createFileRoute("/integrations")({
  component: () => (
    <MarketingLayout>
      <IntegrationsPage />
    </MarketingLayout>
  ),
});

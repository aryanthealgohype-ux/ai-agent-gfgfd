import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { AnalyticsPage } from "@/components/marketing/analytics-page";

export const Route = createFileRoute("/analytics")({
  component: () => (
    <MarketingLayout>
      <AnalyticsPage />
    </MarketingLayout>
  ),
});

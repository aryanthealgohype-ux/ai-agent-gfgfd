import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { PricingPage } from "@/components/marketing/pricing-page";

export const Route = createFileRoute("/pricing")({
  component: () => (
    <MarketingLayout>
      <PricingPage />
    </MarketingLayout>
  ),
});

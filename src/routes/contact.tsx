import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { PremiumMarketingPage } from "@/components/marketing/premium-page";

export const Route = createFileRoute("/contact")({
  component: () => (
    <MarketingLayout>
      <PremiumMarketingPage pageKey="contact" />
    </MarketingLayout>
  ),
});

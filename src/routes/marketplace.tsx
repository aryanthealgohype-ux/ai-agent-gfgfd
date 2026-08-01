import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { MarketplacePage } from "@/components/marketing/marketplace-page";

export const Route = createFileRoute("/marketplace")({
  component: () => (
    <MarketingLayout>
      <MarketplacePage />
    </MarketingLayout>
  ),
});

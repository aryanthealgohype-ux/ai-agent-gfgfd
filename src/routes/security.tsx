import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { SecurityPage } from "@/components/marketing/security-page";

export const Route = createFileRoute("/security")({
  component: () => (
    <MarketingLayout>
      <SecurityPage />
    </MarketingLayout>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { EnterprisePage } from "@/components/marketing/enterprise-page";

export const Route = createFileRoute("/enterprise")({
  component: () => (
    <MarketingLayout>
      <EnterprisePage />
    </MarketingLayout>
  ),
});

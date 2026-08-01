import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { DevelopersPage } from "@/components/marketing/developers-page";

export const Route = createFileRoute("/developers")({
  component: () => (
    <MarketingLayout>
      <DevelopersPage />
    </MarketingLayout>
  ),
});

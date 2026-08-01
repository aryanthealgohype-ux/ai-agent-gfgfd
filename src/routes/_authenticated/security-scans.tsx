import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { SecurityScanDashboard } from "@/components/security-scan-dashboard";

export const Route = createFileRoute("/_authenticated/security-scans")({
  head: () => ({
    meta: [
      { title: "Security Scans | AI Operating System" },
      {
        name: "description",
        content: "Admin security scan history, severity trends, finding details and exportable evidence reports.",
      },
      { property: "og:title", content: "Security Scans | AI Operating System" },
      {
        property: "og:description",
        content: "Admin security scan history with severity metrics, remediation details and CSV/PDF exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityScansPage,
});

function SecurityScansPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="size-4" />
            Admin security
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Security scan history
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review workspace posture scans, inspect open findings, and export remediation evidence.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" />
          Weekly posture review
        </div>
      </header>
      <SecurityScanDashboard />
    </div>
  );
}

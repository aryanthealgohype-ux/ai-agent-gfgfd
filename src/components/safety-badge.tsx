import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABELS: Record<number, string> = {
  1: "Safe · autonomous",
  2: "Low risk",
  3: "Medium risk",
  4: "High risk · approval",
  5: "Critical · approval",
};

export function SafetyBadge({ rating, className }: { rating: number; className?: string }) {
  const tone =
    rating <= 2
      ? "bg-safe-low/15 text-safe-low"
      : rating === 3
        ? "bg-safe-mid/15 text-safe-mid"
        : "bg-safe-high/15 text-safe-high";

  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", tone, className)}>
      {rating}/5 · {LABELS[rating] ?? "Unrated"}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "succeeded" || status === "approved" || status === "active"
      ? "bg-safe-low/15 text-safe-low"
      : status === "failed" || status === "rejected" || status === "denied"
        ? "bg-destructive/15 text-destructive"
        : status === "pending_approval" || status === "pending"
          ? "bg-safe-mid/15 text-safe-mid"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium capitalize", tone)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

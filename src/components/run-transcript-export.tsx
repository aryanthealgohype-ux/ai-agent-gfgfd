import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { getRunTranscript } from "@/lib/guardrails.functions";
import { exportTranscriptCsv, exportTranscriptPdf } from "@/lib/transcript-export";
import { Button } from "@/components/ui/button";

/** One-click transcript export for a single run (events, errors, cost summary). */
export function TranscriptExport({ runId, size = "sm" }: { runId: string; size?: "sm" | "default" }) {
  const fetchTranscript = useServerFn(getRunTranscript);
  const [busy, setBusy] = useState<"pdf" | "csv" | null>(null);

  async function handle(kind: "pdf" | "csv") {
    setBusy(kind);
    try {
      const transcript = await fetchTranscript({ data: { runId } });
      if (kind === "pdf") exportTranscriptPdf(transcript);
      else exportTranscriptCsv(transcript);
      toast.success(`Transcript exported as ${kind.toUpperCase()}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex shrink-0 gap-1">
      <Button variant="outline" size={size} disabled={busy !== null} onClick={() => handle("pdf")}>
        <FileText className="size-3.5" />
        {busy === "pdf" ? "…" : "PDF"}
      </Button>
      <Button variant="outline" size={size} disabled={busy !== null} onClick={() => handle("csv")}>
        <FileDown className="size-3.5" />
        {busy === "csv" ? "…" : "CSV"}
      </Button>
    </div>
  );
}

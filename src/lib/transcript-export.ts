import jsPDF from "jspdf";
import type { getRunTranscript } from "@/lib/guardrails.functions";

export type Transcript = Awaited<ReturnType<typeof getRunTranscript>>;

function stamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function fileBase(transcript: Transcript) {
  const slug = transcript.run.agents?.slug ?? "agent";
  return `run-${slug}-${transcript.run.id.slice(0, 8)}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Full event/cost transcript as CSV — one row per event plus a summary block. */
export function exportTranscriptCsv(transcript: Transcript) {
  const { run, events, approval, deliveries } = transcript;
  const lines: string[] = [];

  lines.push(["section", "timestamp", "level", "detail", "value"].join(","));
  const meta: Array<[string, unknown]> = [
    ["agent", run.agents?.name],
    ["agent_slug", run.agents?.slug],
    ["safety_rating", run.agents?.safety_rating],
    ["status", run.status],
    ["model", run.model],
    ["prompt_tokens", run.prompt_tokens],
    ["completion_tokens", run.completion_tokens],
    ["cost_usd", Number(run.cost_usd ?? 0).toFixed(6)],
    ["duration_ms", run.duration_ms],
    ["created_at", run.created_at],
    ["completed_at", run.completed_at],
    ["error", run.error],
  ];
  for (const [key, value] of meta) {
    lines.push(["summary", csvCell(run.created_at), "", csvCell(key), csvCell(value)].join(","));
  }
  lines.push(["input", csvCell(run.created_at), "", csvCell("input"), csvCell(run.input)].join(","));
  lines.push(["output", csvCell(run.completed_at), "", csvCell("output"), csvCell(run.output)].join(","));

  if (approval) {
    lines.push(
      ["approval", csvCell(approval.decided_at ?? approval.created_at), "", csvCell(approval.status), csvCell(approval.reason)].join(","),
    );
  }

  for (const event of events) {
    lines.push(
      ["event", csvCell(event.at), csvCell(event.level), csvCell(event.message), csvCell(event.archived ? "archived" : "live")].join(","),
    );
  }

  for (const delivery of deliveries) {
    lines.push(
      [
        "webhook",
        csvCell(delivery.delivered_at),
        csvCell(delivery.status),
        csvCell(delivery.url),
        csvCell(`attempts=${delivery.attempts} code=${delivery.last_status_code ?? "-"} ${delivery.last_error ?? ""}`),
      ].join(","),
    );
  }

  download(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${fileBase(transcript)}.csv`);
}

/** Paginated PDF transcript: header, cost summary, task, output, timeline, webhooks. */
export function exportTranscriptPdf(transcript: Transcript) {
  const { run, events, approval, deliveries } = transcript;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  let y = margin;

  function ensure(space: number) {
    if (y + space > bottom) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string) {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(text, margin, y);
    y += 16;
  }

  function body(text: string, size = 9.5) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    for (const line of doc.splitTextToSize(text || "—", width) as string[]) {
      ensure(14);
      doc.text(line, margin, y);
      y += 12;
    }
    y += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${run.agents?.name ?? "Agent"} — run transcript`, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Run ${run.id} · ${run.agents?.category ?? ""} · safety ${run.agents?.safety_rating ?? "?"}/5 · status ${run.status}`,
    margin,
    y,
  );
  y += 22;

  heading("Cost & timing summary");
  body(
    [
      `Model: ${run.model ?? "—"}`,
      `Tokens: ${run.prompt_tokens ?? 0} in / ${run.completion_tokens ?? 0} out`,
      `Estimated cost: $${Number(run.cost_usd ?? 0).toFixed(6)}`,
      `Duration: ${run.duration_ms ? `${run.duration_ms} ms` : "—"}`,
      `Started: ${stamp(run.created_at)}`,
      `Completed: ${stamp(run.completed_at)}`,
    ].join("\n"),
  );

  if (approval) {
    heading("Approval");
    body(
      `Status: ${approval.status}\nRequested: ${stamp(approval.created_at)}\nDecided: ${stamp(approval.decided_at)}\nReason: ${approval.reason ?? "—"}`,
    );
  }

  heading("Task input");
  body(run.input);

  if (run.error) {
    heading("Error");
    body(run.error);
  }

  heading("Output");
  body(run.output ?? "No output recorded.");

  heading(`Event timeline (${events.length})`);
  for (const event of events) {
    body(
      `[${stamp(event.at)}] ${event.level.toUpperCase()}${event.archived ? " (archived)" : ""} — ${event.message}`,
      8.5,
    );
  }
  if (!events.length) body("No events recorded.");

  if (deliveries.length) {
    heading("Webhook deliveries");
    for (const delivery of deliveries) {
      body(
        `${delivery.status} · ${delivery.attempts} attempt(s) · HTTP ${delivery.last_status_code ?? "-"} · ${delivery.url}${delivery.last_error ? `\nLast error: ${delivery.last_error}` : ""}`,
        8.5,
      );
    }
  }

  doc.save(`${fileBase(transcript)}.pdf`);
}

import { useMemo } from "react";

type DiffLine = { kind: "same" | "added" | "removed"; text: string; leftNo?: number; rightNo?: number };

/** Classic LCS line diff — small enough for prompts, no dependency needed. */
function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let leftNo = 1;
  let rightNo = 1;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i]!, leftNo: leftNo++, rightNo: rightNo++ });
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      out.push({ kind: "removed", text: a[i]!, leftNo: leftNo++ });
      i += 1;
    } else {
      out.push({ kind: "added", text: b[j]!, rightNo: rightNo++ });
      j += 1;
    }
  }
  while (i < a.length) out.push({ kind: "removed", text: a[i++]!, leftNo: leftNo++ });
  while (j < b.length) out.push({ kind: "added", text: b[j++]!, rightNo: rightNo++ });
  return out;
}

export type DiffSide = {
  label: string;
  systemPrompt: string;
  model: string;
  requiresApproval: boolean;
};

export function PromptDiff({
  before,
  after,
  contextLines = 3,
}: {
  before: DiffSide;
  after: DiffSide;
  contextLines?: number;
}) {
  const lines = useMemo(() => diffLines(before.systemPrompt, after.systemPrompt), [before, after]);

  const added = lines.filter((l) => l.kind === "added").length;
  const removed = lines.filter((l) => l.kind === "removed").length;

  // Collapse long unchanged stretches so the actual change is what you read.
  const visible = useMemo(() => {
    const keep = new Set<number>();
    lines.forEach((line, index) => {
      if (line.kind === "same") return;
      for (let k = index - contextLines; k <= index + contextLines; k += 1) {
        if (k >= 0 && k < lines.length) keep.add(k);
      }
    });
    const rows: Array<{ type: "line"; line: DiffLine } | { type: "gap"; count: number }> = [];
    let gap = 0;
    lines.forEach((line, index) => {
      if (keep.has(index)) {
        if (gap) {
          rows.push({ type: "gap", count: gap });
          gap = 0;
        }
        rows.push({ type: "line", line });
      } else {
        gap += 1;
      }
    });
    if (gap) rows.push({ type: "gap", count: gap });
    return rows;
  }, [lines, contextLines]);

  const metaChanges = [
    before.model !== after.model ? { label: "Model", from: before.model, to: after.model } : null,
    before.requiresApproval !== after.requiresApproval
      ? {
          label: "Approval gate",
          from: before.requiresApproval ? "required" : "not required",
          to: after.requiresApproval ? "required" : "not required",
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; from: string; to: string }>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
          {before.label} → {after.label}
        </span>
        <span className="rounded-md bg-safe-low/15 px-2 py-1 font-medium text-safe-low">+{added} added</span>
        <span className="rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive">
          −{removed} removed
        </span>
        {!added && !removed && !metaChanges.length && (
          <span className="text-muted-foreground">No differences between these versions.</span>
        )}
      </div>

      {metaChanges.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          {metaChanges.map((change) => (
            <li key={change.label} className="text-foreground">
              <span className="font-medium">{change.label}:</span>{" "}
              <span className="text-destructive line-through">{change.from}</span>{" "}
              <span className="text-safe-low">→ {change.to}</span>
            </li>
          ))}
        </ul>
      )}

      {(added > 0 || removed > 0) && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full border-collapse font-mono text-[11px] leading-relaxed">
            <tbody>
              {visible.map((row, index) =>
                row.type === "gap" ? (
                  <tr key={`gap-${index}`} className="bg-muted/50">
                    <td colSpan={3} className="px-3 py-1 text-center text-[10px] text-muted-foreground">
                      ⋯ {row.count} unchanged line{row.count === 1 ? "" : "s"}
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={`line-${index}`}
                    className={
                      row.line.kind === "added"
                        ? "bg-safe-low/10"
                        : row.line.kind === "removed"
                          ? "bg-destructive/10"
                          : undefined
                    }
                  >
                    <td className="w-10 select-none border-r border-border px-2 py-0.5 text-right text-muted-foreground">
                      {row.line.leftNo ?? ""}
                    </td>
                    <td className="w-10 select-none border-r border-border px-2 py-0.5 text-right text-muted-foreground">
                      {row.line.rightNo ?? ""}
                    </td>
                    <td className="whitespace-pre-wrap px-3 py-0.5 text-foreground">
                      <span
                        className={
                          row.line.kind === "added"
                            ? "text-safe-low"
                            : row.line.kind === "removed"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {row.line.kind === "added" ? "+ " : row.line.kind === "removed" ? "− " : "  "}
                      </span>
                      {row.line.text || " "}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

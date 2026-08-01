import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { jsPDF } from "jspdf";
import { ChevronDown, Download, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { exportSecurityFindings, listSecurityScans, type SecurityScan } from "@/lib/security.functions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEVERITY_STYLES = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function saveTextFile(filename: string, contentType: string, content: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function savePdf(filename: string, scan: SecurityScan) {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(16);
  doc.text(scan.label, 14, y);
  y += 9;
  doc.setFontSize(10);
  doc.text(`Created ${new Date(scan.createdAt).toLocaleString()} | ${scan.totalFindings} findings`, 14, y);
  y += 10;

  scan.findings.forEach((finding) => {
    if (y > 268) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(11);
    doc.text(`${finding.severity.toUpperCase()} - ${finding.title}`, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(`Affected: ${finding.affectedObject}`, 180), 14, y);
    y += 6;
    doc.text(doc.splitTextToSize(`Remediation: ${finding.remediation}`, 180), 14, y);
    y += 12;
  });

  doc.save(filename);
}

export function SecurityScanDashboard() {
  const fetchScans = useServerFn(listSecurityScans);
  const exportFindings = useServerFn(exportSecurityFindings);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: scans = [], isLoading, error } = useQuery({
    queryKey: ["security-scans"],
    queryFn: () => fetchScans(),
  });

  const selectedScan = useMemo(
    () => scans.find((scan) => scan.id === (selectedScanId || scans[0]?.id)) ?? scans[0],
    [scans, selectedScanId],
  );

  const severityData = selectedScan
    ? Object.entries(selectedScan.severityCounts).map(([severity, count]) => ({ severity, count }))
    : [];
  const trendData = scans
    .slice()
    .reverse()
    .map((scan) => ({
      date: new Date(scan.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      findings: scan.totalFindings,
      critical: scan.severityCounts.critical,
      high: scan.severityCounts.high,
    }));

  async function handleExport(format: "csv" | "pdf") {
    if (!selectedScan) return;
    const result = await exportFindings({ data: { scanId: selectedScan.id, format } });
    if (format === "csv") {
      saveTextFile(result.filename, result.contentType, result.content);
      return;
    }
    savePdf(result.filename, JSON.parse(result.content).scan);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading security scan history...</p>;
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-6 text-sm text-destructive">
          Only workspace admins can view security scan history.
        </CardContent>
      </Card>
    );
  }

  if (!selectedScan) {
    return <p className="text-sm text-muted-foreground">No security scans have been recorded yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={selectedScan.id} onValueChange={setSelectedScanId}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Select scan" />
          </SelectTrigger>
          <SelectContent>
            {scans.map((scan) => (
              <SelectItem key={scan.id} value={scan.id}>
                {scan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleExport("csv")}>
            <Download className="mr-2 size-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleExport("pdf")}>
            <FileText className="mr-2 size-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {severityData.map((item) => (
          <Card key={item.severity}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">{item.severity}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{item.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="size-4" />
              Severity breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="severity" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" />
              Findings trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="findings" stroke="#18181b" strokeWidth={2} />
                <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} />
                <Line type="monotone" dataKey="high" stroke="#ea580c" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-sm">
            <span>Findings</span>
            <Badge variant={selectedScan.status === "completed" ? "secondary" : "destructive"}>
              {selectedScan.totalFindings} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedScan.findings.map((finding) => {
            const open = expanded === finding.id;
            return (
              <button
                key={finding.id}
                type="button"
                onClick={() => setExpanded(open ? null : finding.id)}
                className="w-full rounded-lg border bg-card p-4 text-left transition hover:border-foreground/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("border", SEVERITY_STYLES[finding.severity])}>
                        {finding.severity}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">{finding.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{finding.affectedObject}</p>
                  </div>
                  <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
                </div>
                {open && (
                  <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Category</p>
                      <p className="mt-1 text-foreground">{finding.category}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Evidence</p>
                      <p className="mt-1 text-foreground">{finding.evidence}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Remediation</p>
                      <p className="mt-1 text-foreground">{finding.remediation}</p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

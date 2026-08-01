import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Users, 
  FileCheck, 
  Eye, 
  Check, 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApprovalTask {
  id: string;
  agent: string;
  action: string;
  cost: string;
  triggeredBy: string;
  riskRating: number;
}

const INITIAL_TASKS: ApprovalTask[] = [
  { id: "tx-402", agent: "finance_agent.py", action: "Initiate invoice payout to Stripes vendor for $1,250", cost: "$0.024", triggeredBy: "ops_scheduler", riskRating: 4 },
  { id: "db-901", agent: "ops_scheduler.py", action: "Delete temporary customer migration logs older than 30 days", cost: "$0.008", triggeredBy: "audit_logger", riskRating: 4 },
  { id: "out-120", agent: "outreach_writer.py", action: "Blast bulk emails to 1,500 leads retrieved from HubSpot CRM Base", cost: "$0.120", triggeredBy: "crm_agent", riskRating: 3 },
];

export function SecurityPage() {
  const [tasks, setTasks] = useState<ApprovalTask[]>(INITIAL_TASKS);
  const [auditLogs, setAuditLogs] = useState([
    { timestamp: "13:42:01", action: "User 'admin@company.com' logged in", source: "Auth Service", status: "SUCCESS" },
    { timestamp: "13:42:05", action: "reception_agent.py requested Slack API authorization", source: "API Gateway", status: "SUCCESS" },
    { timestamp: "13:42:43", action: "Gated action payout_scheduler.py Level 4 approval hold", source: "Approval Engine", status: "GATED" },
  ]);

  const handleApprove = (task: ApprovalTask) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    toast.success(`Task ${task.id} approved successfully! Executing...`);
    
    // Add to audit logs
    setAuditLogs(prev => [
      { 
        timestamp: new Date().toTimeString().split(' ')[0] ?? "", 
        action: `Approved: ${task.action} (${task.agent})`, 
        source: "Human Approver", 
        status: "APPROVED" 
      },
      ...prev
    ]);
  };

  const handleDeny = (task: ApprovalTask) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    toast.error(`Task ${task.id} rejected and terminated.`);
    
    // Add to audit logs
    setAuditLogs(prev => [
      { 
        timestamp: new Date().toTimeString().split(' ')[0] ?? "", 
        action: `Rejected: ${task.action} (${task.agent})`, 
        source: "Human Approver", 
        status: "REJECTED" 
      },
      ...prev
    ]);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-16 relative z-10">
      
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 flex items-center gap-1.5 w-fit">
          <ShieldCheck className="size-3" /> Zero Trust Governance
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
          Enterprise Security & Safety
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          The AI Operating System provides SOC2, GDPR, and HIPAA compliance out of the box. Protect your database resources using role-based access controls and manual approvals.
        </p>
      </div>

      {/* Human in the Loop Simulator */}
      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left approval list */}
        <div className="md:col-span-7 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
              <Clock className="size-4 text-violet-600 animate-pulse" /> Human-In-The-Loop Approval Queue
            </h2>
            <p className="text-xs text-zinc-500">Simulate approving or denying high-risk agent actions in real-time.</p>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 text-xs relative"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 font-bold">{task.id}</span>
                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-none shadow-none font-bold uppercase text-[9px]">{task.agent}</Badge>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-none text-[9px] font-bold">Safety rating: {task.riskRating}</Badge>
                    </div>

                    <p className="text-zinc-800 font-medium leading-relaxed bg-zinc-50/50 p-3 rounded-lg border border-zinc-100 font-mono">{task.action}</p>

                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Trigger: {task.triggeredBy} • Cost: {task.cost}</span>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeny(task)}
                          className="border-zinc-200 text-red-600 hover:bg-red-50 hover:border-red-200 text-xs rounded-xl h-8 px-3.5"
                        >
                          <X className="size-3.5 mr-1" /> Deny
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(task)}
                          className="bg-zinc-950 text-white hover:bg-zinc-900 text-xs rounded-xl h-8 px-3.5"
                        >
                          <Check className="size-3.5 mr-1" /> Approve
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-8 text-center bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl text-xs text-zinc-500">
                  <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-3" />
                  <p className="font-bold text-zinc-800">All tasks authorized</p>
                  <p className="mt-1">The approval queue is currently empty.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Audit log feed */}
        <div className="md:col-span-5 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-950">Security Audit Logs</h2>
            <p className="text-xs text-zinc-500">Real-time log stream showing authenticated users and gateway events.</p>
          </div>

          <div className="p-5 bg-zinc-950 text-zinc-300 font-mono text-[10px] rounded-2xl border border-zinc-900 space-y-3 min-h-[300px] shadow-lg">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="flex gap-2 border-b border-zinc-900 pb-2">
                <span className="text-zinc-600 select-none">[{log.timestamp}]</span>
                <div>
                  <span className={cn(
                    log.status === "APPROVED" || log.status === "SUCCESS" ? "text-emerald-400" :
                    log.status === "REJECTED" ? "text-red-400" : "text-amber-400"
                  )}>[{log.status}]</span>
                  <p className="text-zinc-200 mt-1 leading-relaxed">{log.action}</p>
                  <p className="text-zinc-500 mt-0.5 text-[8px]">Source: {log.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Security Specs Grid */}
      <div className="grid gap-6 md:grid-cols-4 pt-12 border-t border-zinc-100 text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-950 font-bold">
            <Lock className="size-4 text-violet-600" />
            <h3>Data Encryption</h3>
          </div>
          <p className="text-zinc-500 leading-relaxed">Vault credentials encrypted at rest using AES-256-GCM. Active database connections secured via TLS 1.3 tunnels.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-950 font-bold">
            <Users className="size-4 text-violet-600" />
            <h3>Role-Based Access</h3>
          </div>
          <p className="text-zinc-500 leading-relaxed">Verify team member authentication via SAML SSO. Enforce multi-factor access protocols for all administrator workspaces.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-950 font-bold">
            <FileCheck className="size-4 text-violet-600" />
            <h3>Compliance Standard</h3>
          </div>
          <p className="text-zinc-500 leading-relaxed">Fully prepared for SOC2 audits, GDPR data privacy compliance, and HIPAA privacy rules in processing medical texts.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-950 font-bold">
            <AlertTriangle className="size-4 text-violet-600" />
            <h3>Anomalous Halting</h3>
          </div>
          <p className="text-zinc-500 leading-relaxed">AI OS monitors and halts agent executions automatically if they experience sudden token usage spikes or rate limits.</p>
        </div>
      </div>

    </div>
  );
}

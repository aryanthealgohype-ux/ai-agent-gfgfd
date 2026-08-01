import React, { useState } from "react";
import { 
  TrendingUp, 
  Coins, 
  Activity, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  TrendingDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar 
} from "recharts";

const DATA_RUNS = [
  { day: "Mon", runs: 420, cost: 2.1 },
  { day: "Tue", runs: 580, cost: 2.9 },
  { day: "Wed", runs: 850, cost: 4.25 },
  { day: "Thu", runs: 720, cost: 3.6 },
  { day: "Fri", runs: 900, cost: 4.5 },
  { day: "Sat", runs: 310, cost: 1.55 },
  { day: "Sun", runs: 450, cost: 2.25 },
];

const DATA_LATENCY = [
  { hour: "00:00", latency: 120 },
  { hour: "04:00", latency: 130 },
  { hour: "08:00", latency: 145 },
  { hour: "12:00", latency: 160 },
  { hour: "16:00", latency: 138 },
  { hour: "20:00", latency: 124 },
];

export function AnalyticsPage() {
  const [metricTab, setMetricTab] = useState<"runs" | "latency">("runs");

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-12 relative z-10 font-sans">
      
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 flex items-center gap-1.5 w-fit">
          <Activity className="size-3" /> Real-Time Telemetry
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
          Analytics Command Center
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Monitor computational token spend, active api execution, response latencies, and transaction costs across your multi-tenant workspace.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        <Card className="border-zinc-200/80 bg-white/60 p-6 space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-xs font-medium">Weekly Agent Runs</span>
            <Activity className="size-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-950">4,230</h2>
            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5"><TrendingUp className="size-3" /> +14.2% from last week</p>
          </div>
        </Card>

        <Card className="border-zinc-200/80 bg-white/60 p-6 space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-xs font-medium">Total Token Spent</span>
            <Coins className="size-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-950">84.2M</h2>
            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5"><TrendingUp className="size-3" /> +8.5% from last week</p>
          </div>
        </Card>

        <Card className="border-zinc-200/80 bg-white/60 p-6 space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-xs font-medium">Avg Execution Latency</span>
            <Clock className="size-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-950">136ms</h2>
            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5"><TrendingDown className="size-3" /> -12ms latency drop</p>
          </div>
        </Card>

        <Card className="border-zinc-200/80 bg-white/60 p-6 space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-xs font-medium">Total Cost Accrued</span>
            <Coins className="size-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-950">$21.15</h2>
            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5"><TrendingUp className="size-3" /> +11.4% token efficiency</p>
          </div>
        </Card>

      </div>

      {/* Visual Chart Canvas */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/60 p-6 sm:p-8 space-y-6 shadow-sm">
        
        {/* Chart Header Tabs */}
        <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
          <h2 className="text-sm font-bold text-zinc-950">Fleet Activity Trends</h2>
          
          <div className="flex gap-2 bg-zinc-50 border border-zinc-200/60 rounded-xl p-1 text-[10px] font-semibold text-zinc-500">
            <button 
              onClick={() => setMetricTab("runs")}
              className={`px-3 py-1 rounded-lg transition-colors ${metricTab === 'runs' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'hover:text-zinc-950'}`}
            >
              RUNS & COST
            </button>
            <button 
              onClick={() => setMetricTab("latency")}
              className={`px-3 py-1 rounded-lg transition-colors ${metricTab === 'latency' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'hover:text-zinc-950'}`}
            >
              LATENCY (ms)
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-[280px] w-full text-xs">
          {metricTab === "runs" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA_RUNS}>
                <defs>
                  <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="runs" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRuns)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA_LATENCY}>
                <XAxis dataKey="hour" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="latency" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

    </div>
  );
}

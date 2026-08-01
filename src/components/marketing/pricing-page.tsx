import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, HelpCircle, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [agentCount, setAgentCount] = useState(5);

  const calculateEstimate = () => {
    const basePrice = billingPeriod === "monthly" ? 20 : 16;
    const additionalAgentCost = 5;
    return (basePrice + (agentCount - 1) * additionalAgentCost).toFixed(0);
  };

  const handleSelectPlan = (plan: string) => {
    toast.success(`Redirecting to Stripe checkout for ${plan} plan...`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-16 relative z-10 font-sans">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 font-bold">Transparent Pricing</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-zinc-950">
          Flexible Plans for AI Governance
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-xl mx-auto">
          Start for free, then upgrade as your agent volume and database connectors grow. Cancel or change plans at any time.
        </p>

        {/* Toggle billing period */}
        <div className="pt-6">
          <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-200/60 rounded-xl p-1 text-[10px] font-semibold text-zinc-500">
            <button 
              onClick={() => setBillingPeriod("monthly")}
              className={`px-3 py-1 rounded-lg transition-colors ${billingPeriod === 'monthly' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'hover:text-zinc-950'}`}
            >
              MONTHLY
            </button>
            <button 
              onClick={() => setBillingPeriod("annual")}
              className={`px-3 py-1 rounded-lg transition-colors ${billingPeriod === 'annual' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'hover:text-zinc-950'}`}
            >
              ANNUAL (20% OFF)
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3 items-stretch">
        
        {/* Plan 1 */}
        <Card className="border-zinc-200/80 bg-white/60 p-8 flex flex-col justify-between h-full hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
          <div className="space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Starter</span>
              <h2 className="text-2xl font-bold text-zinc-950">Free Tier</h2>
              <p className="text-xs text-zinc-500">For developers experimenting with agent models locally.</p>
            </div>
            
            <div className="flex items-baseline text-zinc-950">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-xs text-zinc-500 ml-1">/ forever</span>
            </div>

            <ul className="space-y-2 text-xs text-zinc-600 border-t border-zinc-100 pt-6">
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Up to 3 running agents</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> local CLI & SDK access</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Level 1 auto-approvals only</li>
            </ul>
          </div>

          <Button 
            variant="outline" 
            onClick={() => handleSelectPlan("Starter")}
            className="w-full mt-8 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-semibold"
          >
            Start Free
          </Button>
        </Card>

        {/* Plan 2 - Popular */}
        <Card className="border-violet-500/30 bg-white/80 p-8 flex flex-col justify-between h-full shadow-lg relative transform lg:-translate-y-2">
          <div className="absolute top-0 right-8 bg-violet-600 text-white text-[9px] font-bold tracking-wider uppercase px-3 py-1 rounded-b-lg">
            Most Popular
          </div>
          
          <div className="space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Pro Team</span>
              <h2 className="text-2xl font-bold text-zinc-950">Standard Pro</h2>
              <p className="text-xs text-zinc-500">For teams automating secure integrations & database workflows.</p>
            </div>
            
            <div className="flex items-baseline text-zinc-950">
              <span className="text-4xl font-extrabold">{billingPeriod === "monthly" ? "$20" : "$16"}</span>
              <span className="text-xs text-zinc-500 ml-1">/ month</span>
            </div>

            <ul className="space-y-2 text-xs text-zinc-600 border-t border-zinc-100 pt-6">
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Up to 23 specialized agents</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Full credentials encryption vault</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Level 1–4 approvals gating</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> 30+ pre-built API connectors</li>
            </ul>
          </div>

          <Button 
            onClick={() => handleSelectPlan("Pro")}
            className="w-full mt-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-[0_4px_15px_rgba(124,58,237,0.2)]"
          >
            Upgrade to Pro
          </Button>
        </Card>

        {/* Plan 3 */}
        <Card className="border-zinc-200/80 bg-white/60 p-8 flex flex-col justify-between h-full hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
          <div className="space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Enterprise</span>
              <h2 className="text-2xl font-bold text-zinc-950">Scale Custom</h2>
              <p className="text-xs text-zinc-500">For large organizations requiring VPC deployments & custom SLAs.</p>
            </div>
            
            <div className="flex items-baseline text-zinc-950">
              <span className="text-4xl font-extrabold">Custom</span>
              <span className="text-xs text-zinc-500 ml-1">/ contact</span>
            </div>

            <ul className="space-y-2 text-xs text-zinc-600 border-t border-zinc-100 pt-6">
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Unlimited agents & pipelines</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Private cloud / VPC deployment</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Dedicated SLA support 24/7</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> SAML SSO / Okta connection</li>
            </ul>
          </div>

          <Button 
            asChild
            variant="outline" 
            className="w-full mt-8 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-semibold"
          >
            <Link to="/contact">Contact Enterprise</Link>
          </Button>
        </Card>

      </div>

      {/* Spend Calculator Widget */}
      <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-6 sm:p-8 space-y-6 max-w-2xl mx-auto shadow-sm">
        <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
          <Cpu className="size-5 text-violet-600" /> Estimate Your Volume Costs
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Number of Running Agents:</span>
            <span className="font-bold text-zinc-950">{agentCount} agents</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="50"
            value={agentCount}
            onChange={(e) => setAgentCount(parseInt(e.target.value))}
            className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        <div className="pt-4 border-t border-zinc-200/60 flex justify-between items-center text-xs">
          <span className="text-zinc-500">Estimated Monthly Token Spend:</span>
          <span className="text-lg font-bold text-zinc-950">${calculateEstimate()} / mo</span>
        </div>
      </div>

    </div>
  );
}

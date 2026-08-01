import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield, Key, Server, FileCheck, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function EnterprisePage() {
  const [ssoConfigured, setSsoConfigured] = useState(false);

  const handleTestSso = () => {
    setSsoConfigured(true);
    toast.success("Mock SAML SSO configuration tested successfully!");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-16 relative z-10 font-sans">
      
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 font-bold">Scale Governance</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
          Built for Large Organizations
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          The AI Operating System provides VPC deployments, dedicated SLAs, Okta SSO synchronization, and custom model routing to ensure total compliance.
        </p>
      </div>

      {/* Feature Columns */}
      <div className="grid gap-8 md:grid-cols-3">
        
        <Card className="border-zinc-200/80 bg-white/60 p-6 space-y-4 hover:border-zinc-300 transition-all duration-300">
          <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-800">
            <Server className="size-5" />
          </span>
          <h3 className="text-base font-bold text-zinc-950">Private Cloud & VPC</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">Deploy the AI OS cluster within your AWS VPC, Google Cloud project, or Microsoft Azure tenant. Retain total network ownership.</p>
        </Card>

        <Card className="border-zinc-200/80 bg-white/60 p-6 space-y-4 hover:border-zinc-300 transition-all duration-300">
          <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-800">
            <Key className="size-5" />
          </span>
          <h3 className="text-base font-bold text-zinc-950">SAML SSO & Identity</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">Integrate Okta, Microsoft Entra ID (Azure AD), Ping Identity, or Google Workspace to sync user profiles and manage RBAC.</p>
        </Card>

        <Card className="border-zinc-200/80 bg-white/60 p-6 space-y-4 hover:border-zinc-300 transition-all duration-300">
          <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-800">
            <FileCheck className="size-5" />
          </span>
          <h3 className="text-base font-bold text-zinc-950">Custom SLAs & Support</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">Dedicated account support teams, 24/7 incident response, custom integration building, and 99.99% uptime guarantees.</p>
        </Card>

      </div>

      {/* Interactive SSO Simulation Panel */}
      <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-6 sm:p-8 grid md:grid-cols-2 gap-8 items-center shadow-sm">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
            <Key className="size-5 text-violet-600" /> Identity Provider Test Sandbox
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">Configure and test Okta/SAML SSO credentials instantly inside our enterprise dashboard simulator.</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Metadata URL validated</div>
            <div className="flex items-center gap-2"><Check className="size-4 text-emerald-500 shrink-0" /> Entity ID bound</div>
          </div>
          <Button 
            onClick={handleTestSso}
            disabled={ssoConfigured}
            className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs"
          >
            {ssoConfigured ? "SSO Configuration Active" : "Test SSO Connection"}
          </Button>
        </div>

        {/* Visual Terminal preview */}
        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-900 text-[10px] font-mono text-zinc-400 min-h-[160px] flex flex-col justify-between shadow-lg">
          <div>
            <p className="text-zinc-500">// Fetching SAML Config...</p>
            <p className="text-zinc-200 mt-2">IDP_ISSUER: https://okta.com/ai-os-enterprise</p>
            <p className="text-zinc-200">BINDING_PROTOCOL: urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect</p>
            {ssoConfigured && (
              <p className="text-emerald-400 font-semibold mt-2">&gt; [OKTA] Connection verified. RBAC profiles synced.</p>
            )}
          </div>
          <span className="text-[9px] text-zinc-600">Secure Vault Session</span>
        </div>
      </div>

    </div>
  );
}

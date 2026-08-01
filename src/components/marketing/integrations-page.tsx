import React, { useState } from "react";
import { 
  Bot, 
  Search, 
  Check, 
  Plugs, 
  Settings, 
  ExternalLink,
  Lock,
  Link2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  name: string;
  category: "LLM" | "Database" | "Communication" | "Payment" | "Automation" | "Dev Tools";
  connected: boolean;
  desc: string;
}

const INTEGRATIONS_LIST: Integration[] = [
  // LLMs
  { id: "openai", name: "OpenAI", category: "LLM", connected: true, desc: "Access GPT-4o, GPT-4o-mini, and text embeddings APIs." },
  { id: "anthropic", name: "Anthropic", category: "LLM", connected: true, desc: "Access Claude 3.5 Sonnet, Claude 3 Opus, and Haiku models." },
  { id: "gemini", name: "Gemini", category: "LLM", connected: false, desc: "Connect Google's Gemini Pro and Flash models for large context tasks." },
  { id: "groq", name: "Groq", category: "LLM", connected: false, desc: "Connect ultra-low latency model inferences for real-time agents." },
  { id: "openrouter", name: "OpenRouter", category: "LLM", connected: false, desc: "Router endpoint linking to multiple open source LLM providers." },
  // Databases
  { id: "supabase", name: "Supabase", category: "Database", connected: true, desc: "Store vector embeddings and query user table profiles." },
  { id: "postgres", name: "PostgreSQL", category: "Database", connected: false, desc: "Query relational data tables directly from agents." },
  { id: "airtable", name: "Airtable", category: "Database", connected: false, desc: "Synchronize agent outputs directly into Airtable bases." },
  // Communication
  { id: "slack", name: "Slack", category: "Communication", connected: true, desc: "Listen for mentions and send rich layout notifications to channels." },
  { id: "gmail", name: "Gmail", category: "Communication", connected: true, desc: "Read support emails and reply using gated safety scores." },
  { id: "discord", name: "Discord", category: "Communication", connected: false, desc: "Dispatch bot alerts and answer community questions." },
  { id: "telegram", name: "Telegram", category: "Communication", connected: false, desc: "Manage client alerts and execute chat command workflows." },
  { id: "whatsapp", name: "WhatsApp", category: "Communication", connected: false, desc: "Send automated alerts to customers via Twilio." },
  { id: "linkedin", name: "LinkedIn", category: "Communication", connected: false, desc: "Draft and publish profile updates from marketing agents." },
  // Payments
  { id: "stripe", name: "Stripe", category: "Payment", connected: true, desc: "Invoice clients and review billing subscriptions safely." },
  { id: "paypal", name: "PayPal", category: "Payment", connected: false, desc: "Process invoices and check balances securely." },
  // Automation
  { id: "zapier", name: "Zapier", category: "Automation", connected: false, desc: "Trigger 5000+ app connectors from agent pipelines." },
  { id: "n8n", name: "n8n", category: "Automation", connected: false, desc: "Self-hosted workflow orchestration triggers." },
  { id: "make", name: "Make", category: "Automation", connected: false, desc: "Integrate visual scenario templates." },
  // Dev Tools
  { id: "github", name: "GitHub", category: "Dev Tools", connected: true, desc: "Monitor repositories, create issues, and trigger PR updates." },
  { id: "vercel", name: "Vercel", category: "Dev Tools", connected: false, desc: "Monitor deployments and fetch environment variables." },
  { id: "notion", name: "Notion", category: "Dev Tools", connected: false, desc: "Sync page notes and tables from your knowledge hub." },
];

export function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_LIST);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      toast.error("Please enter a valid connection credential!");
      return;
    }
    
    setIntegrations(prev => prev.map(item => {
      if (item.id === editingId) {
        return { ...item, connected: true };
      }
      return item;
    }));
    
    const matched = integrations.find(i => i.id === editingId);
    toast.success(`Connected to ${matched?.name} successfully!`);
    setEditingId(null);
    setApiKeyInput("");
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, connected: false };
      }
      return item;
    }));
    toast.error("Disconnected API key connection");
  };

  const filteredIntegrations = integrations.filter(i => {
    const matchesCategory = activeCategory === "All" || i.category === activeCategory;
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-12 relative z-10">
      
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
          Integrations Hub
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Securely link API endpoints and LLMs to your agent fleet. Credentials are encrypted end-to-end and stored in our isolated vault server.
        </p>
      </div>

      {/* Filter Tools */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-zinc-100 pb-6">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {["All", "LLM", "Database", "Communication", "Payment", "Automation", "Dev Tools"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                activeCategory === cat 
                  ? "bg-zinc-950 text-white border-zinc-950 shadow-sm" 
                  : "bg-zinc-50 text-zinc-500 border-zinc-200/60 hover:bg-zinc-100 hover:text-zinc-950"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations..." 
            className="pl-9 text-xs border-zinc-200 bg-white/60 focus-visible:ring-violet-500"
          />
        </div>

      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredIntegrations.map((item) => (
          <Card 
            key={item.id}
            className="border-zinc-200/80 bg-white/60 hover:bg-white transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between"
          >
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-3">
                
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-800 font-bold text-xs select-none">
                      {item.name[0]}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-950">{item.name}</h3>
                  </div>
                  
                  {/* Status Indicator */}
                  {item.connected ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-none hover:bg-emerald-500/10 flex items-center gap-1 text-[9px] font-bold">
                      <Check className="size-2.5" /> Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-zinc-100 text-zinc-400 border border-zinc-200/60 shadow-none hover:bg-zinc-100 text-[9px] font-bold">
                      Offline
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>

              {/* Footer Connect Button */}
              <div className="pt-4 border-t border-zinc-100/60 flex justify-between items-center text-[10px]">
                <span className="text-zinc-400 font-medium">{item.category}</span>
                
                {item.connected ? (
                  <button 
                    onClick={() => handleDisconnect(item.id)}
                    className="text-red-500 hover:text-red-700 font-semibold hover:underline"
                  >
                    Disconnect
                  </button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => setEditingId(item.id)}
                    className="bg-zinc-950 text-white hover:bg-zinc-900 rounded-lg text-[10px] h-7 px-3 flex items-center gap-1"
                  >
                    <Link2 className="size-3" /> Connect
                  </Button>
                )}
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Dialog Modal */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6">
          <form onSubmit={handleConnect}>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-zinc-950 font-extrabold">Authorize Connector</DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs leading-relaxed">
                Configure credential access token for {integrations.find(i => i.id === editingId)?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">API Token / Private Key</label>
                <Input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste api credential tokens..."
                  className="text-xs border-zinc-200 focus-visible:ring-violet-500 bg-zinc-50/50"
                />
              </div>
              <div className="flex gap-2 p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-[10px] text-zinc-500">
                <AlertCircle className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>Your credentials are encrypted inside an isolated VPC vault and accessed only during agent runtime execution loops.</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingId(null)} className="text-xs rounded-xl hover:bg-zinc-100">Cancel</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-xl px-4">Save Connection</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

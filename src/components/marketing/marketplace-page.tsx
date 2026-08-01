import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Search, 
  Star, 
  Download, 
  Filter, 
  Check, 
  ExternalLink, 
  Grid, 
  List,
  Sparkles,
  ShoppingBag,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: "Finance" | "Marketing" | "Customer Support" | "Productivity";
  author: string;
  rating: number;
  installs: string;
  desc: string;
  isFeatured?: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: "stripe-payouts",
    name: "Stripe Automated Invoicing",
    category: "Finance",
    author: "AI OS Core Team",
    rating: 4.9,
    installs: "14.2k",
    desc: "Ingests client data, checks spreadsheet balances, draft Stripe charges, and emails receipts using AI safety ratings.",
    isFeatured: true
  },
  {
    id: "social-scheduler",
    name: "Multi-Channel Social Writer",
    category: "Marketing",
    author: "Community Devs",
    rating: 4.7,
    installs: "8.5k",
    desc: "Drafts and translates Twitter, LinkedIn, and Facebook threads synchronously, ensuring matching brand tone guidelines.",
    isFeatured: true
  },
  {
    id: "document-summarizer",
    name: "Notion & PDF Knowledge Sync",
    category: "Productivity",
    author: "AI OS Core Team",
    rating: 4.8,
    installs: "24.1k",
    desc: "Uploads PDFs to vector databases, extracts core action items, and populates a corporate Notion hub database.",
    isFeatured: false
  },
  {
    id: "customer-triage",
    name: "Zendesk Auto-Responder",
    category: "Customer Support",
    author: "Zendesk Labs",
    rating: 4.6,
    installs: "12.0k",
    desc: "Analyzes incoming support tickets, determines user intent, drafts responses, and escalates safety scores above level 3.",
    isFeatured: false
  }
];

export function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState<"All" | "Finance" | "Marketing" | "Customer Support" | "Productivity">("All");
  const [search, setSearch] = useState("");
  const [installedTemplates, setInstalledTemplates] = useState<string[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleInstall = (template: Template) => {
    if (installedTemplates.includes(template.id)) {
      toast.success("Template is already installed in your workspace!");
      return;
    }
    
    setInstallingId(template.id);
    toast.info(`Installing template: ${template.name}...`);
    
    setTimeout(() => {
      setInstalledTemplates((prev) => [...prev, template.id]);
      setInstallingId(null);
      toast.success(`Successfully installed ${template.name}!`);
    }, 1500);
  };

  const filteredTemplates = TEMPLATES.filter(t => {
    const matchesCategory = activeCategory === "All" || t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-16 relative z-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-8">
        <div className="space-y-4 max-w-2xl">
          <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 flex items-center gap-1.5 w-fit">
            <ShoppingBag className="size-3" /> Agent Templates Store
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
            AI Agents Marketplace
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Discover, download, and deploy production-ready AI agent templates configured by developers worldwide. Install templates directly to your workspaces.
          </p>
        </div>
      </div>

      {/* Featured Templates Row */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
          <Sparkles className="size-4 text-violet-600 animate-pulse" /> Featured Templates
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {TEMPLATES.filter(t => t.isFeatured).map((template) => (
            <Card key={template.id} className="relative overflow-hidden border-zinc-200/80 bg-white/60 hover:bg-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              <div className="absolute top-0 right-0 bg-violet-600 text-white text-[9px] font-bold tracking-wider uppercase px-3 py-1 rounded-bl-xl shadow-sm">
                Featured
              </div>
              <CardContent className="p-8 space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">{template.category}</span>
                  <h3 className="text-lg font-bold text-zinc-950">{template.name}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{template.desc}</p>
                </div>
                <div className="flex justify-between items-center text-xs pt-4 border-t border-zinc-100/60">
                  <div className="flex items-center gap-4 text-zinc-400">
                    <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {template.rating}</span>
                    <span>{template.installs} installs</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleInstall(template)}
                    disabled={installingId === template.id}
                    className="bg-zinc-950 text-white hover:bg-zinc-900 text-xs rounded-xl"
                  >
                    {installingId === template.id ? (
                      <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                    ) : installedTemplates.includes(template.id) ? (
                      <Check className="size-3.5 mr-1" />
                    ) : (
                      <Download className="size-3.5 mr-1" />
                    )}
                    {installedTemplates.includes(template.id) ? "Installed" : "Install"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Catalog Search & Filters */}
      <div className="space-y-8 border-t border-zinc-100 pt-16">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h2 className="text-xl font-bold text-zinc-950">Explore Catalog</h2>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..." 
                className="pl-9 text-xs border-zinc-200 bg-white/60 focus-visible:ring-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Categories filters */}
        <div className="flex flex-wrap gap-2">
          {["All", "Finance", "Marketing", "Customer Support", "Productivity"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
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

        {/* Grid List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template) => (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <Card className="border-zinc-200/80 bg-white/60 hover:bg-white transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] h-full flex flex-col justify-between">
                  <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{template.category}</span>
                      <h3 className="text-sm font-bold text-zinc-950">{template.name}</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">{template.desc}</p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-zinc-100/60 text-[10px]">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="flex items-center gap-0.5"><Star className="size-3 fill-amber-400 text-amber-400" /> {template.rating}</span>
                        <span>{template.installs}</span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleInstall(template)}
                        disabled={installingId === template.id}
                        className="bg-zinc-950 text-white hover:bg-zinc-900 text-xs rounded-xl h-8 px-3"
                      >
                        {installingId === template.id ? (
                          <span className="size-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1" />
                        ) : installedTemplates.includes(template.id) ? (
                          <Check className="size-3 mr-1" />
                        ) : (
                          <Download className="size-3 mr-1" />
                        )}
                        {installedTemplates.includes(template.id) ? "Installed" : "Install"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}

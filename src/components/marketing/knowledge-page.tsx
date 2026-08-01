import React, { useState } from "react";
import { 
  Database, 
  Search, 
  FileText, 
  Settings, 
  Sparkles, 
  Upload, 
  Check, 
  ArrowRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DataAsset {
  name: string;
  type: "PDF" | "CSV" | "Notion" | "Website" | "Audio";
  chunks: number;
  status: "INDEXED" | "PROCESSING";
  size: string;
}

const DATA_ASSETS: DataAsset[] = [
  { name: "company_benefits_handbook.pdf", type: "PDF", chunks: 420, status: "INDEXED", size: "2.4 MB" },
  { name: "customer_support_faqs.csv", type: "CSV", chunks: 180, status: "INDEXED", size: "840 KB" },
  { name: "Product Roadmap Hub", type: "Notion", chunks: 1200, status: "INDEXED", size: "--" },
  { name: "ai-os-documentation-guide", type: "Website", chunks: 250, status: "INDEXED", size: "--" },
  { name: "q2_earnings_call_transcript.mp3", type: "Audio", chunks: 640, status: "PROCESSING", size: "12.8 MB" }
];

interface SearchResult {
  chunk: string;
  source: string;
  score: number;
}

const SEARCH_RESULTS_MOCK: Record<string, SearchResult[]> = {
  "payout": [
    { chunk: "...finance_agent handles outgoing Stripe invoice payouts. Actions above $500 are hard-gated for admin approval...", source: "company_benefits_handbook.pdf", score: 0.94 },
    { chunk: "...payout processing relies on encrypted Stripe tokens authorized in the Integrations portal vault settings...", source: "ai-os-documentation-guide", score: 0.81 }
  ],
  "safety": [
    { chunk: "...safety levels range from 1 to 5. Levels 4 and 5 indicate high-risk database or fund transactions requiring manual signoff...", source: "company_benefits_handbook.pdf", score: 0.96 },
    { chunk: "...if security score filters detect suspicious token peaks, the agent is immediately halted to prevent model drift...", source: "customer_support_faqs.csv", score: 0.89 }
  ]
};

export function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    toast.info("Querying vector database embeddings index...");

    setTimeout(() => {
      const cleanedQuery = searchQuery.toLowerCase();
      let matchedKey = "safety";
      if (cleanedQuery.includes("pay") || cleanedQuery.includes("stripe") || cleanedQuery.includes("money")) {
        matchedKey = "payout";
      }
      
      setResults(SEARCH_RESULTS_MOCK[matchedKey] || []);
      setIsSearching(false);
      toast.success("RAG semantic fetch completed");
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-16 relative z-10">
      
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <Badge className="bg-violet-600/10 text-violet-600 border-none shadow-none hover:bg-violet-600/15 flex items-center gap-1.5 w-fit">
          <Database className="size-3" /> RAG & Vector Indexing
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-950">
          Knowledge Hub
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Upload manuals, PDF handbooks, Notion links, and websites to seed your agent fleet. Data is chunked, embedded using OpenAI text-embedding-3 models, and indexed in Supabase PgVector.
        </p>
      </div>

      {/* RAG Search Playground */}
      <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
            <Sparkles className="size-4 text-violet-600 animate-pulse" /> Semantic Index Explorer
          </h2>
          <p className="text-xs text-zinc-500">Query your corporate knowledge base to view matching vector chunks and semantic similarity scores.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 size-4 text-zinc-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search index... (try 'payout instructions' or 'safety guard rails')"
              className="pl-10 text-xs border-zinc-200 bg-white shadow-sm focus-visible:ring-violet-500 py-6"
            />
          </div>
          <Button type="submit" disabled={isSearching} className="bg-zinc-950 hover:bg-zinc-900 text-white px-6">
            {isSearching ? "Querying..." : "Semantic Search"}
          </Button>
        </form>

        {/* Results Stream */}
        {results.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-zinc-200/60">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Matching Vector Chunks</h3>
            <div className="space-y-3">
              {results.map((res, index) => (
                <div key={index} className="p-4 bg-white border border-zinc-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1.5"><FileText className="size-3.5" /> Source: {res.source}</span>
                    <Badge variant="secondary" className="bg-violet-50 text-violet-600 border border-violet-100 shadow-none font-mono">Similarity: {res.score}</Badge>
                  </div>
                  <p className="text-zinc-700 leading-relaxed font-mono bg-zinc-50/50 p-3 rounded-lg border border-zinc-100">{res.chunk}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Dataset Grid */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-zinc-950">Indexed Corpora Data Sets</h2>
          <Button size="sm" variant="outline" className="border-zinc-200 hover:bg-zinc-50 text-xs rounded-xl flex items-center gap-1.5">
            <Upload className="size-3.5" /> Upload File
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_ASSETS.map((asset) => (
            <Card key={asset.name} className="border-zinc-200/80 bg-white/60 hover:bg-white transition-all shadow-[0_1px_4px_rgba(0,0,0,0.01)]">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-800">
                      <FileText className="size-4 text-zinc-600" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-950 max-w-[150px] truncate" title={asset.name}>{asset.name}</h3>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wide mt-0.5">{asset.type} • {asset.size}</p>
                    </div>
                  </div>

                  <Badge className={cn("text-[8px] font-bold px-1.5 py-0.5", 
                    asset.status === "INDEXED" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-none hover:bg-emerald-500/10" : 
                    "bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-none hover:bg-amber-500/10 animate-pulse"
                  )}>
                    {asset.status}
                  </Badge>
                </div>

                <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  <span>Chunks: {asset.chunks}</span>
                  <span className="flex items-center gap-1 text-violet-600 hover:underline cursor-pointer">Explore <ArrowRight className="size-2.5" /></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}

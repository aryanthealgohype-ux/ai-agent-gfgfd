import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Search,
  Bell,
  MessageSquare,
  X,
  Send,
  Keyboard,
  Volume2,
  Globe,
  Check,
  Github,
  Twitter,
  Cpu,
  Sparkles,
  ArrowRight,
  Menu,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const navigate = useNavigate();

  // State variables for global components
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    {
      sender: "ai",
      text: "Hello! I am your AI OS Assistant. How can I help you orchestrate your agent fleet today?",
    },
  ]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: "reception_agent.py auto-approved task 'Sort Emails'",
      time: "2m ago",
      read: false,
    },
    {
      id: 2,
      text: "finance_agent.py gated action (Level 4 safety audit)",
      time: "15m ago",
      read: false,
    },
    { id: 3, text: "Google Sheets connection re-authenticated", time: "1h ago", read: true },
  ]);

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
      if (
        e.key === "c" &&
        !isSearchOpen &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        setIsChatOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Show cookie banner after a short delay if not dismissed
    const cookieConsent = localStorage.getItem("cookie-consent");
    if (!cookieConsent) {
      const timer = setTimeout(() => setShowCookieBanner(true), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    toast.success(`Searching for "${searchQuery}"...`);
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    const userMsg = newChatMessage;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setNewChatMessage("");

    // Simulate AI response
    setTimeout(() => {
      let aiText =
        "I can help you build custom workflows. Try exploring the '/workflows' page or sign in to build your own!";
      if (userMsg.toLowerCase().includes("pricing") || userMsg.toLowerCase().includes("cost")) {
        aiText =
          "We offer Starter ($20/mo) and Pro ($80/mo) tiers, as well as customized Enterprise packages. Check out our '/pricing' page for details.";
      } else if (
        userMsg.toLowerCase().includes("agent") ||
        userMsg.toLowerCase().includes("fleet")
      ) {
        aiText =
          "Our fleet contains 23 specialized agents for tasks like Stripe processing, PDF analysis, and automated emails. Learn more on '/agents'.";
      } else if (
        userMsg.toLowerCase().includes("integrate") ||
        userMsg.toLowerCase().includes("connect")
      ) {
        aiText =
          "We connect with Stripe, Supabase, Gmail, Slack, and over 30 other platforms. You can check them out on the '/integrations' page.";
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: aiText }]);
    }, 1000);
  };

  const handleNewsletterSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    toast.success("Thanks for subscribing to our AI OS digest!");
    setNewsletterEmail("");
  };

  const handleAcceptCookies = () => {
    localStorage.setItem("cookie-consent", "true");
    setShowCookieBanner(false);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All alerts marked as read");
  };

  // Nav categories
  const NAV_CATEGORIES = {
    platform: [
      { name: "AI Agents Directory", href: "/agents", desc: "Browse 23 specialized agents" },
      {
        name: "AI Models Router",
        href: "/models",
        desc: "Compare GPT, Claude, Gemini and local models",
      },
      { name: "AI Studio", href: "/studio", desc: "Build agents, prompts, tools and memory" },
      {
        name: "AI Playground",
        href: "/playground",
        desc: "Test chat, vision, voice, docs and code",
      },
      { name: "Workflows Builder", href: "/workflows", desc: "Drag-and-drop node graph builder" },
      { name: "Knowledge Hub", href: "/knowledge", desc: "RAG search & vector indexing" },
      {
        name: "Analytics Dashboard",
        href: "/analytics",
        desc: "Token tracking, logs, and cost metrics",
      },
    ],
    marketplace: [
      {
        name: "AI Marketplace Store",
        href: "/marketplace",
        desc: "Install agent and workflow packs",
      },
      {
        name: "Templates Library",
        href: "/templates",
        desc: "Sales, HR, finance, legal and support templates",
      },
      {
        name: "Apps Marketplace",
        href: "/apps",
        desc: "Connect Google, Slack, GitHub, Stripe and more",
      },
      {
        name: "Integrations Hub",
        href: "/integrations",
        desc: "Credential flows and connector states",
      },
    ],
    solutions: [
      { name: "Enterprise Hub", href: "/enterprise", desc: "VPC setup, SSO, Custom SLAs" },
      { name: "Zero Trust Security", href: "/security", desc: "RBAC, Audit trails, human gating" },
      { name: "Trust Center", href: "/trust", desc: "SOC2, GDPR, HIPAA, ISO and Responsible AI" },
      { name: "Customers", href: "/customers", desc: "Stories, ROI, testimonials and metrics" },
      { name: "Compare", href: "/compare", desc: "AI OS vs automation and AI platforms" },
    ],
    resources: [
      { name: "Documentation", href: "/docs", desc: "SDK guides and API reference docs" },
      {
        name: "AI Academy",
        href: "/academy",
        desc: "Courses, tutorials, examples and certifications",
      },
      { name: "Product Roadmap", href: "/roadmap", desc: "Upcoming agent updates and timelines" },
      { name: "Changelog updates", href: "/changelog", desc: "Weekly release logs and notes" },
      { name: "Releases", href: "/releases", desc: "Version history and upcoming features" },
      { name: "Community Forum", href: "/community", desc: "Connect on Discord and GitHub" },
      { name: "System Status", href: "/status", desc: "Live system uptime indicators" },
      { name: "Blog", href: "/blog", desc: "AI engineering articles and tutorials" },
      { name: "Careers", href: "/careers", desc: "Open roles and team culture" },
      { name: "About", href: "/about", desc: "Mission, timeline and company values" },
      { name: "Contact", href: "/contact", desc: "Sales, support and partnership channels" },
    ],
  };

  const ALL_PAGES = [
    { name: "Home Center", href: "/" },
    { name: "AI Agents Fleet", href: "/agents" },
    { name: "AI Models", href: "/models" },
    { name: "AI Studio", href: "/studio" },
    { name: "AI Playground", href: "/playground" },
    { name: "AI Marketplace Store", href: "/marketplace" },
    { name: "Templates Library", href: "/templates" },
    { name: "Apps Marketplace", href: "/apps" },
    { name: "Integrations Hub", href: "/integrations" },
    { name: "Workflows Graph", href: "/workflows" },
    { name: "Knowledge base", href: "/knowledge" },
    { name: "Security Audit", href: "/security" },
    { name: "Analytics Dashboard", href: "/analytics" },
    { name: "Pricing Tiers", href: "/pricing" },
    { name: "Enterprise Hub", href: "/enterprise" },
    { name: "Developer Docs", href: "/developers" },
    { name: "Customers", href: "/customers" },
    { name: "Compare Platforms", href: "/compare" },
    { name: "Trust Center", href: "/trust" },
    { name: "AI Academy", href: "/academy" },
    { name: "Releases", href: "/releases" },
    { name: "Blog Posts", href: "/blog" },
    { name: "Careers Openings", href: "/careers" },
    { name: "About Story", href: "/about" },
    { name: "Contact Team", href: "/contact" },
    { name: "Changelog updates", href: "/changelog" },
    { name: "Roadmap Timeline", href: "/roadmap" },
    { name: "System Status Page", href: "/status" },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-hidden relative font-sans">
      {/* Sticky Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-transform group-hover:scale-105">
              <Bot className="size-5" />
            </span>
            <span className="font-extrabold tracking-tight text-zinc-950">AI Operating System</span>
          </Link>

          {/* Desktop Mega Menu Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {/* Platform Dropdown */}
            <div className="relative group/menu py-2">
              <button className="flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors">
                Platform <ChevronDown className="size-3" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-200">
                <div className="space-y-3">
                  {NAV_CATEGORIES.platform.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block p-2 rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      <p className="text-xs font-bold text-zinc-950">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Marketplace Dropdown */}
            <div className="relative group/menu py-2">
              <button className="flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors">
                Marketplace <ChevronDown className="size-3" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-200">
                <div className="space-y-3">
                  {NAV_CATEGORIES.marketplace.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block p-2 rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      <p className="text-xs font-bold text-zinc-950">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Solutions Dropdown */}
            <div className="relative group/menu py-2">
              <button className="flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors">
                Solutions <ChevronDown className="size-3" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-200">
                <div className="space-y-3">
                  {NAV_CATEGORIES.solutions.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block p-2 rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      <p className="text-xs font-bold text-zinc-950">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Developers */}
            <Link
              to="/developers"
              className="text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
            >
              Developers
            </Link>

            {/* Pricing */}
            <Link
              to="/pricing"
              className="text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
            >
              Pricing
            </Link>

            {/* Resources Dropdown */}
            <div className="relative group/menu py-2">
              <button className="flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors">
                Resources <ChevronDown className="size-3" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-200">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {NAV_CATEGORIES.resources.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block p-2 rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      <p className="text-xs font-bold text-zinc-950">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 border border-zinc-200/60 bg-zinc-50 text-xs px-3"
            >
              <Search className="size-4" />
              <span>Search</span>
              <kbd className="bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-[10px] ml-1">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors sm:hidden"
            >
              <Search className="size-5" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors"
              >
                <Bell className="size-5" />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl z-50 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <span className="text-xs font-bold text-zinc-950">
                          System Notifications
                        </span>
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-violet-600 hover:underline"
                        >
                          Mark read
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "p-2 rounded-xl text-xs",
                              n.read
                                ? "bg-zinc-50/50 text-zinc-500"
                                : "bg-violet-500/5 text-zinc-800 border-l-2 border-violet-500",
                            )}
                          >
                            <p className="font-medium">{n.text}</p>
                            <p className="text-[10px] text-zinc-400 mt-1">{n.time}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Documentation (Link to Docs page) */}
            <Button
              asChild
              variant="outline"
              className="hidden lg:inline-flex border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              <Link to="/docs">Docs</Link>
            </Button>

            {/* SignIn / Dashboard Router link */}
            <Button
              asChild
              className="bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Link to="/auth">Sign in</Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-zinc-100 bg-white/95 px-6 py-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                    Platform
                  </h4>
                  <div className="mt-2 space-y-2">
                    {NAV_CATEGORIES.platform.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-sm text-zinc-700 hover:text-zinc-950 font-semibold"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                    Resources
                  </h4>
                  <div className="mt-2 space-y-2">
                    {[
                      ...NAV_CATEGORIES.resources.slice(0, 4),
                      ...NAV_CATEGORIES.marketplace.slice(1, 3),
                    ].map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-sm text-zinc-700 hover:text-zinc-950 font-semibold"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/marketplace" onClick={() => setIsMobileMenuOpen(false)}>
                    Marketplace
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    Create Workspace
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Core Children Renders Here */}
      <div className="relative">{children}</div>

      {/* Keyboard Shortcut Icon Trigger (Bottom Left) */}
      <button
        onClick={() => setIsShortcutsOpen(true)}
        className="fixed bottom-6 left-6 z-40 p-3 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 hover:scale-105 shadow-xl transition-all"
        title="Keyboard Shortcuts"
      >
        <Keyboard className="size-5" />
      </button>

      {/* Floating AI Assistant Chat Widget (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-80 sm:w-96 h-[400px] rounded-2xl border border-zinc-200 bg-white shadow-2xl flex flex-col overflow-hidden mb-3"
            >
              {/* Chat Header */}
              <div className="bg-zinc-950 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-sm">AI OS Platform Assistant</span>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col text-xs max-w-[80%] rounded-xl p-3",
                      msg.sender === "user"
                        ? "bg-violet-600 text-white ml-auto"
                        : "bg-white border border-zinc-200 mr-auto text-zinc-800",
                    )}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-100 flex gap-2 bg-white"
              >
                <Input
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Ask a question about the AI OS..."
                  className="flex-1 text-xs border-zinc-200 focus-visible:ring-violet-500"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-4 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-full hover:scale-105 shadow-2xl transition-transform"
        >
          <MessageSquare className="size-6 animate-pulse" />
        </button>
      </div>

      {/* Global Newsletter & Animated Footer */}
      <footer className="border-t border-zinc-100 bg-zinc-50 relative z-10">
        {/* Newsletter Section */}
        <div className="mx-auto max-w-6xl px-6 py-12 border-b border-zinc-200/50 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-2">
            <h3 className="text-xl font-extrabold text-zinc-950">Stay Ahead in Agentic AI</h3>
            <p className="text-sm text-zinc-500 max-w-lg">
              Get product updates, new AI agent releases, and workflow blueprints delivered straight
              to your inbox.
            </p>
          </div>
          <div className="md:col-span-5">
            <form onSubmit={handleNewsletterSubscribe} className="flex gap-2 w-full">
              <Input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                className="bg-white border-zinc-200 text-zinc-800 flex-1 focus-visible:ring-violet-500"
              />
              <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-900 shrink-0">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="mx-auto max-w-6xl px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <Bot className="size-4" />
              </span>
              <span className="font-bold text-zinc-950">AI Operating System</span>
            </Link>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              The unified command center to run, gate, and audit enterprise-grade AI agents at
              scale.
            </p>

            {/* Social Icons */}
            <div className="flex gap-4 text-zinc-400">
              <a href="#" className="hover:text-zinc-600 transition-colors">
                <Twitter className="size-4" />
              </a>
              <a href="#" className="hover:text-zinc-600 transition-colors">
                <Github className="size-4" />
              </a>
              <a href="#" className="hover:text-zinc-600 transition-colors">
                <Globe className="size-4" />
              </a>
            </div>
          </div>

          {/* Link Col 1 */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500">
              <li>
                <Link to="/agents" className="hover:text-zinc-950">
                  AI Agents Directory
                </Link>
              </li>
              <li>
                <Link to="/models" className="hover:text-zinc-950">
                  AI Models
                </Link>
              </li>
              <li>
                <Link to="/studio" className="hover:text-zinc-950">
                  AI Studio
                </Link>
              </li>
              <li>
                <Link to="/workflows" className="hover:text-zinc-950">
                  Visual Workflow Builder
                </Link>
              </li>
              <li>
                <Link to="/playground" className="hover:text-zinc-950">
                  AI Playground
                </Link>
              </li>
            </ul>
          </div>

          {/* Link Col 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500">
              <li>
                <Link to="/marketplace" className="hover:text-zinc-950">
                  AI Marketplace
                </Link>
              </li>
              <li>
                <Link to="/templates" className="hover:text-zinc-950">
                  Templates Library
                </Link>
              </li>
              <li>
                <Link to="/apps" className="hover:text-zinc-950">
                  Apps Marketplace
                </Link>
              </li>
              <li>
                <Link to="/integrations" className="hover:text-zinc-950">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Link Col 3 */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500">
              <li>
                <Link to="/about" className="hover:text-zinc-950">
                  About Story
                </Link>
              </li>
              <li>
                <Link to="/customers" className="hover:text-zinc-950">
                  Customers
                </Link>
              </li>
              <li>
                <Link to="/trust" className="hover:text-zinc-950">
                  Trust Center
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-zinc-950">
                  Careers Hub
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-zinc-950">
                  Contact Team
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Lower Footer */}
        <div className="border-t border-zinc-200/50 py-8 text-center text-xs text-zinc-400 flex flex-col sm:flex-row justify-between items-center max-w-6xl mx-auto px-6 gap-4">
          <p>© {new Date().getFullYear()} AI Operating System. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-600">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-zinc-600">
              Terms of Service
            </a>

            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 ml-2 border border-zinc-200 bg-white rounded-full px-3 py-1">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-600 font-medium">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Search / Command Palette Dialog (⌘K) */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-lg p-0 bg-white border border-zinc-200 shadow-2xl overflow-hidden rounded-2xl">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center p-4 border-b border-zinc-100"
          >
            <Search className="size-5 text-zinc-400 mr-3 shrink-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages, documentation, or agents..."
              className="border-0 shadow-none focus-visible:ring-0 text-sm p-0 bg-transparent text-zinc-800"
            />
            <button type="submit" className="hidden">
              Search
            </button>
          </form>

          <div className="p-4 max-h-[300px] overflow-y-auto space-y-4">
            <div>
              <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                Pages & Routes
              </h5>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ALL_PAGES.map((page) => (
                  <button
                    key={page.href}
                    onClick={() => {
                      navigate({ to: page.href });
                      setIsSearchOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-xl text-left text-xs text-zinc-700 hover:text-zinc-950 transition-colors"
                  >
                    <ArrowRight className="size-3 text-zinc-400 shrink-0" />
                    <span>{page.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-zinc-950 font-extrabold">Keyboard Shortcuts</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Quickly navigate the AI OS Command Center.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 font-mono text-xs text-zinc-700">
            <div className="flex justify-between items-center py-2 border-b border-zinc-100">
              <span>Open Search Panel</span>
              <kbd className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-[10px] font-bold">
                ⌘K / Ctrl+K
              </kbd>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-100">
              <span>Toggle AI Assistant Chat</span>
              <kbd className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-[10px] font-bold">
                C
              </kbd>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-100">
              <span>Close Active Overlay / Modal</span>
              <kbd className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-[10px] font-bold">
                ESC
              </kbd>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Show Shortcuts Helper</span>
              <kbd className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-[10px] font-bold">
                ?
              </kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cookie Banner Overlay */}
      <AnimatePresence>
        {showCookieBanner && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 left-6 right-6 sm:left-auto sm:max-w-md bg-white/95 backdrop-blur-xl border border-zinc-200 shadow-2xl rounded-2xl p-5 z-50 space-y-4"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-950">We value your privacy</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                We use essential performance cookies to ensure the system is operational and to
                analyze aggregated fleet traffic metrics.
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCookieBanner(false)}
                className="text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptCookies}
                className="bg-zinc-950 text-white hover:bg-zinc-900"
              >
                Accept All
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

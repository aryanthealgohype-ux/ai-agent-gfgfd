import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordLogin } from "@/lib/account.functions";
import { describeDevice, getDeviceId, setRememberMe } from "@/lib/session";
import { ThemeToggle, useTheme } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/** Only same-origin relative paths may be used as a post-login redirect. */
function safePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = safePath(search["next"]);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in | AI Operating System" },
      {
        name: "description",
        content:
          "Secure sign-in to your AI agent fleet command center: run, approve and monitor specialised AI agents.",
      },
      { property: "og:title", content: "Sign in | AI Operating System" },
      {
        property: "og:description",
        content: "Secure sign-in to your AI agent fleet command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const stampLogin = useServerFn(recordLogin);
  const { next } = Route.useSearch();
  useTheme();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A valid session must never see this page again.
  useEffect(() => {
    let cancelled = false;
    const land = () => {
      if (next) {
        window.location.replace(next);
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) land();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) land();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, next]);

  /** Warms every dashboard dependency before we leave the login screen. */
  async function completeSignIn() {
    setHandoff(true);
    setRememberMe(remember);
    const device = describeDevice();
    try {
      await stampLogin({
        data: {
          deviceId: getDeviceId(),
          label: device.label,
          userAgent: device.userAgent,
          platform: device.platform,
        },
      });
    } catch {
      // Device bookkeeping must never block a valid sign-in.
    }
    await queryClient.invalidateQueries();
    // An OAuth/MCP consent handoff must return to the page that sent us here.
    if (next) {
      window.location.replace(next);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        toast.success("Password reset link sent. Check your inbox.");
        setMode("signin");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: next ? `${window.location.origin}${next}` : window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      toast.success("Welcome back.");
      await completeSignIn();
    } catch (caught) {
      const message = (caught as Error).message || "Something went wrong. Please try again.";
      setError(
        message.includes("Invalid login credentials")
          ? "That email and password don't match."
          : message,
      );
      setHandoff(false);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (oauthError) throw oauthError;
    } finally {
      setBusy(false);
    }
  }

  if (handoff) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="relative flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bot className="size-6" />
            <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30" />
          </span>
          <p className="text-sm font-medium text-foreground">Preparing your command center…</p>
          <p className="text-xs text-muted-foreground">
            Loading organization, permissions and agent fleet.
          </p>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Brand rail — hidden on phones so the form owns the viewport. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary-foreground/10 blur-2xl"
        />
        <Link to="/" className="relative flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary-foreground/15">
            <Bot className="size-5" />
          </span>
          AI Operating System
        </Link>
        <div className="relative space-y-6">
          <h2 className="max-w-sm text-3xl font-semibold leading-tight">
            One command center for your entire AI agent fleet.
          </h2>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0" /> Safety-rated agents with human approval
              gates
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0" /> Live run logs, spend guardrails and audit
              trails
            </li>
            <li className="flex items-center gap-2">
              <Lock className="size-4 shrink-0" /> Role-based access with per-tenant isolation
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/70">
          Passwords are hashed and managed by the platform auth provider.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Bot className="size-5" />
              </span>
              <span className="text-sm font-semibold text-foreground">AI Operating System</span>
            </Link>
            <ThemeToggle className="ml-auto" />
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6 sm:p-7">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create your workspace"
                      : "Reset your password"}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {mode === "signin"
                    ? "Access your agent fleet command center."
                    : mode === "signup"
                      ? "You get your own organization with all 23 agents provisioned."
                      : "We'll email you a secure link to choose a new password."}
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              {mode !== "forgot" && (
                <>
                  <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or{" "}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form className="space-y-4" onSubmit={submit}>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      maxLength={120}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    required
                  />
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        maxLength={200}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signin" && (
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={remember}
                        onCheckedChange={(value) => setRemember(value === true)}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => {
                        setError(null);
                        setMode("forgot");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {mode === "signin"
                    ? busy
                      ? "Signing in…"
                      : "Sign in"
                    : mode === "signup"
                      ? busy
                        ? "Creating workspace…"
                        : "Create workspace"
                      : busy
                        ? "Sending link…"
                        : "Send reset link"}
                </Button>
              </form>

              <div className="space-y-1 text-center text-sm">
                {mode === "forgot" ? (
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Back to sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => {
                      setError(null);
                      setMode(mode === "signin" ? "signup" : "signin");
                    }}
                  >
                    {mode === "signin"
                      ? "No account yet? Create your workspace"
                      : "Already have an account? Sign in"}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

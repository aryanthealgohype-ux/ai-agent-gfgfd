import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function safePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: safePath(search["next"]),
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [message, setMessage] = useState("Completing secure sign-in...");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        setMessage("No auth session was returned. Please try Google sign-in again.");
        window.setTimeout(() => navigate({ to: "/auth", replace: true }), 1800);
        return;
      }

      if (next) {
        window.location.replace(next);
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate, next]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-6" />
        </span>
        <p className="text-sm font-medium text-foreground">{message}</p>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

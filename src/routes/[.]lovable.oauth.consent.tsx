import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type OAuthClient = { name?: string | null };
type AuthorizationDetails = {
  client?: OAuthClient | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult = { data: AuthorizationDetails | null; error: { message: string } | null };
type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

/** `supabase.auth.oauth` is beta and not in the generated types yet. */
function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the Supabase client reads its session from localStorage.
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id:
      typeof search['authorization_id'] === "string" ? search['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname + location.searchStr },
      });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Bot className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Connect {clientName} to your workspace
              </h1>
              <p className="text-sm text-muted-foreground">AI Agent Commander</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                {clientName} will act as you: read your agent fleet, safety-rated role prompts, run
                transcripts and approval queue, and pause or activate agents where your role allows.
              </span>
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Approve
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={busy}
              onClick={() => decide(false)}
            >
              Deny
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

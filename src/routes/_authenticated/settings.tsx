import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSettings, getWorkspace, listTeam, updatePlaceholders } from "@/lib/fleet.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const FIELDS = [
  { key: "business_name", label: "Business name" },
  { key: "industry", label: "Industry" },
  { key: "tone", label: "Brand tone" },
  { key: "working_hours", label: "Working hours" },
  { key: "escalation_contact", label: "Escalation contact" },
  { key: "primary_language", label: "Primary language" },
  { key: "website", label: "Website" },
  { key: "support_email", label: "Support email" },
] as const;

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Workspace Settings | AI Operating System" },
      {
        name: "description",
        content:
          "Set the business context every agent prompt inherits, and review team members and their roles.",
      },
      { property: "og:title", content: "Workspace Settings | AI Operating System" },
      {
        property: "og:description",
        content: "Set the business context every agent inherits and review team roles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getSettings);
  const fetchTeam = useServerFn(listTeam);
  const fetchWorkspace = useServerFn(getWorkspace);
  const save = useServerFn(updatePlaceholders);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });
  const { data: team = [] } = useQuery({ queryKey: ["team"], queryFn: () => fetchTeam() });
  const { data: workspace } = useQuery({ queryKey: ["workspace"], queryFn: () => fetchWorkspace() });

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = (settings?.placeholders ?? {}) as Record<string, string>;
    setValues(stored);
  }, [settings?.updated_at]);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: { placeholders: values } });
      toast.success("Workspace context saved — agents will use it on the next run");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace?.activeOrg?.name} · these values replace {"{placeholders}"} inside every agent
          prompt at run time.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button disabled={saving} onClick={submit}>
              {saving ? "Saving…" : "Save context"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team & roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {team.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.profile?.full_name ?? member.profile?.email ?? member.user_id}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.profile?.email}</p>
              </div>
              <div className="flex gap-1">
                {member.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="uppercase">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

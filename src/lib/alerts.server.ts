import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AlertEvent = "spend_limit" | "dlq_failure";

export type AlertInput = {
  orgId: string;
  event: AlertEvent;
  title: string;
  body: string;
  severity: "info" | "warning" | "error";
  /** Stable key so the same alert is never delivered twice to the same channel. */
  dedupeKey: string;
  metadata?: Record<string, unknown>;
};

type ChannelRow = {
  id: string;
  kind: "in_app" | "email" | "slack";
  target: string | null;
  label: string | null;
  events: string[];
  enabled: boolean;
};

function plainText(input: AlertInput) {
  return `${input.title}\n\n${input.body}`;
}

async function sendEmail(channel: ChannelRow, input: AlertInput) {
  const to = channel.target?.trim();
  if (!to) throw new Error("No email address configured on this channel");
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Email alerts need the platform API key to be available");

  const { sendLovableEmail } = await import("@lovable.dev/email-js");
  const from = process.env["ALERT_EMAIL_FROM"] ?? "AI Operating System <alerts@lovable.app>";
  await sendLovableEmail(
    {
      to,
      from,
      subject: input.title,
      text: plainText(input),
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5"><h2 style="margin:0 0 12px;font-size:17px">${escapeHtml(input.title)}</h2><p style="margin:0;color:#334155">${escapeHtml(input.body)}</p></div>`,
      label: `alert:${input.event}`,
      idempotency_key: input.dedupeKey,
    },
    { apiKey, idempotencyKey: input.dedupeKey },
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendSlack(channel: ChannelRow, input: AlertInput) {
  const url = channel.target?.trim();
  if (!url || !/^https:\/\/hooks\.slack\.com\//.test(url)) {
    throw new Error("Slack channels need a https://hooks.slack.com/… incoming webhook URL");
  }
  const icon = input.severity === "error" ? ":octagonal_sign:" : input.severity === "warning" ? ":warning:" : ":information_source:";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${icon} *${input.title}*\n${input.body}` }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Slack responded HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function sendInApp(input: AlertInput) {
  await supabaseAdmin.from("notifications").insert({
    org_id: input.orgId,
    title: input.title,
    body: input.body,
    severity: input.severity,
  });
}

/**
 * Fans one alert out to every enabled channel subscribed to the event.
 * Channel failures never bubble up — they are recorded on the channel row so
 * the settings page can surface a broken webhook or bad address.
 */
export async function dispatchAlert(input: AlertInput) {
  const { data: channels } = await supabaseAdmin
    .from("alert_channels")
    .select("id, kind, target, label, events, enabled")
    .eq("org_id", input.orgId)
    .eq("enabled", true);

  const subscribed = ((channels ?? []) as ChannelRow[]).filter((c) => c.events.includes(input.event));

  // In-app is the safety net: if no channel is configured at all, still notify in-app.
  if (!subscribed.some((c) => c.kind === "in_app")) {
    await sendInApp(input);
  }

  const results: Array<{ channelId: string; kind: string; ok: boolean; error?: string }> = [];

  for (const channel of subscribed) {
    try {
      if (channel.kind === "in_app") await sendInApp(input);
      else if (channel.kind === "email") await sendEmail(channel, input);
      else await sendSlack(channel, input);

      await supabaseAdmin
        .from("alert_channels")
        .update({ last_sent_at: new Date().toISOString(), last_error: null })
        .eq("id", channel.id);
      results.push({ channelId: channel.id, kind: channel.kind, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabaseAdmin
        .from("alert_channels")
        .update({ last_error: message.slice(0, 500) })
        .eq("id", channel.id);
      results.push({ channelId: channel.id, kind: channel.kind, ok: false, error: message });
    }
  }

  return results;
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const providerSchema = z.enum(["facebook", "instagram", "x"]);

const SOCIAL_LABEL: Record<string, string> = {
  facebook: "Facebook Page",
  instagram: "Instagram",
  x: "X (Twitter)",
};

/** Which social channels are wired up server-side (no secrets ever returned). */
export const getSocialStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const has = (name: string) => Boolean(process.env[name]);
    return [
      {
        provider: "facebook" as const,
        label: SOCIAL_LABEL["facebook"]!,
        canPublish: has("META_PAGE_ACCESS_TOKEN") && has("FACEBOOK_PAGE_ID"),
        canRead: has("META_PAGE_ACCESS_TOKEN") && has("FACEBOOK_PAGE_ID"),
        requires: ["META_PAGE_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"],
        needsImage: false,
      },
      {
        provider: "instagram" as const,
        label: SOCIAL_LABEL["instagram"]!,
        canPublish: has("META_PAGE_ACCESS_TOKEN") && has("INSTAGRAM_BUSINESS_ID"),
        canRead: has("META_PAGE_ACCESS_TOKEN") && has("INSTAGRAM_BUSINESS_ID"),
        requires: ["META_PAGE_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ID"],
        needsImage: true,
      },
      {
        provider: "x" as const,
        label: SOCIAL_LABEL["x"]!,
        canPublish: has("X_BEARER_TOKEN"),
        canRead: has("X_BEARER_TOKEN"),
        requires: ["X_BEARER_TOKEN"],
        needsImage: false,
      },
    ];
  });

/** Read recent posts / mentions so agents (and humans) can use them as input. */
export const readSocialInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ provider: providerSchema, limit: z.number().int().min(1).max(50).default(10) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: connector } = await context.supabase
      .from("connectors")
      .select("id, org_id")
      .eq("provider", data.provider)
      .maybeSingle();
    if (!connector) throw new Error("This social connector is not available in your workspace.");

    const { readSocial } = await import("@/lib/social.server");
    return readSocial(data.provider, data.limit);
  });

/** Publish an agent output to a social channel. Manager/admin only, always audited. */
export const publishSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: providerSchema,
        text: z.string().min(1).max(5000),
        imageUrl: z.string().url().max(2000).optional(),
        linkUrl: z.string().url().max(2000).optional(),
        runId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: connector } = await context.supabase
      .from("connectors")
      .select("id, org_id, connected, label")
      .eq("provider", data.provider)
      .maybeSingle();
    if (!connector) throw new Error("This social connector is not available in your workspace.");

    const { data: canManage } = await context.supabase.rpc("can_manage", {
      _org_id: connector.org_id,
    });
    if (!canManage) throw new Error("Only admins and managers can publish to social channels.");
    if (!connector.connected) {
      throw new Error(`${connector.label} is not marked connected. Enable it in Connectors first.`);
    }

    const { publishSocial } = await import("@/lib/social.server");
    const { auditLog } = await import("@/lib/agent-exec.server");

    try {
      const result = await publishSocial(data.provider, data.text, {
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
      });
      await auditLog({
        orgId: connector.org_id,
        actorId: context.userId,
        action: "social.published",
        targetType: "social",
        targetId: data.provider,
        metadata: { post_id: result.id, run_id: data.runId ?? null, chars: data.text.length },
      });
      return result;
    } catch (error) {
      await auditLog({
        orgId: connector.org_id,
        actorId: context.userId,
        action: "social.publish_failed",
        targetType: "social",
        targetId: data.provider,
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  });

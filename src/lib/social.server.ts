/**
 * Server-only social media integration helpers.
 * Reads inputs (recent posts / mentions) and publishes outputs
 * (Facebook Page posts, Instagram media, X posts).
 *
 * Every function returns a plain DTO. Credentials come from server env only.
 */

export type SocialProvider = "facebook" | "instagram" | "x";

export type SocialItem = {
  id: string;
  provider: SocialProvider;
  text: string;
  author: string | null;
  permalink: string | null;
  createdAt: string | null;
};

export type SocialPublishResult = {
  provider: SocialProvider;
  id: string;
  permalink: string | null;
};

const graphVersion = () => process.env["META_GRAPH_VERSION"] || "v21.0";
const graph = (path: string) => `https://graph.facebook.com/${graphVersion()}${path}`;

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not configured. Add it to your server secrets, then mark the connector as connected.`,
    );
  }
  return value;
}

async function readJson(response: Response, label: string) {
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const message =
      (parsed as { error?: { message?: string }; detail?: string; title?: string } | null)?.error
        ?.message ??
      (parsed as { detail?: string } | null)?.detail ??
      text.slice(0, 400);
    throw new Error(`${label} failed [${response.status}]: ${message || "unknown error"}`);
  }
  return parsed as Record<string, unknown>;
}

/* ------------------------------- publishing ------------------------------- */

export async function publishToFacebook(message: string, linkUrl?: string) {
  const token = need("META_PAGE_ACCESS_TOKEN");
  const pageId = need("FACEBOOK_PAGE_ID");
  const body = new URLSearchParams({ message, access_token: token });
  if (linkUrl) body.set("link", linkUrl);

  const json = await readJson(
    await fetch(graph(`/${pageId}/feed`), { method: "POST", body }),
    "Facebook publish",
  );
  const id = String(json["id"] ?? "");
  return {
    provider: "facebook" as const,
    id,
    permalink: id ? `https://facebook.com/${id}` : null,
  };
}

export async function publishToInstagram(caption: string, imageUrl: string) {
  const token = need("META_PAGE_ACCESS_TOKEN");
  const igId = need("INSTAGRAM_BUSINESS_ID");

  const container = await readJson(
    await fetch(graph(`/${igId}/media`), {
      method: "POST",
      body: new URLSearchParams({ caption, image_url: imageUrl, access_token: token }),
    }),
    "Instagram media container",
  );
  const creationId = String(container["id"] ?? "");
  if (!creationId) throw new Error("Instagram did not return a media container id.");

  const published = await readJson(
    await fetch(graph(`/${igId}/media_publish`), {
      method: "POST",
      body: new URLSearchParams({ creation_id: creationId, access_token: token }),
    }),
    "Instagram publish",
  );
  const id = String(published["id"] ?? "");
  return { provider: "instagram" as const, id, permalink: null };
}

export async function publishToX(text: string) {
  const token = need("X_BEARER_TOKEN");
  const json = await readJson(
    await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),
    "X publish",
  );
  const data = (json["data"] ?? {}) as { id?: string };
  const id = String(data.id ?? "");
  return {
    provider: "x" as const,
    id,
    permalink: id ? `https://x.com/i/web/status/${id}` : null,
  };
}

/* --------------------------------- reading -------------------------------- */

export async function readFacebookFeed(limit: number): Promise<SocialItem[]> {
  const token = need("META_PAGE_ACCESS_TOKEN");
  const pageId = need("FACEBOOK_PAGE_ID");
  const json = await readJson(
    await fetch(
      graph(
        `/${pageId}/feed?limit=${limit}&fields=id,message,created_time,permalink_url&access_token=${encodeURIComponent(token)}`,
      ),
    ),
    "Facebook read",
  );
  const rows = (json["data"] ?? []) as Array<Record<string, string>>;
  return rows.map((row) => ({
    id: String(row["id"]),
    provider: "facebook" as const,
    text: row["message"] ?? "(no message)",
    author: "Page",
    permalink: row["permalink_url"] ?? null,
    createdAt: row["created_time"] ?? null,
  }));
}

export async function readInstagramMedia(limit: number): Promise<SocialItem[]> {
  const token = need("META_PAGE_ACCESS_TOKEN");
  const igId = need("INSTAGRAM_BUSINESS_ID");
  const json = await readJson(
    await fetch(
      graph(
        `/${igId}/media?limit=${limit}&fields=id,caption,timestamp,permalink,username&access_token=${encodeURIComponent(token)}`,
      ),
    ),
    "Instagram read",
  );
  const rows = (json["data"] ?? []) as Array<Record<string, string>>;
  return rows.map((row) => ({
    id: String(row["id"]),
    provider: "instagram" as const,
    text: row["caption"] ?? "(no caption)",
    author: row["username"] ?? null,
    permalink: row["permalink"] ?? null,
    createdAt: row["timestamp"] ?? null,
  }));
}

export async function readXMentions(limit: number): Promise<SocialItem[]> {
  const token = need("X_BEARER_TOKEN");
  const headers = { Authorization: `Bearer ${token}` };

  const me = await readJson(
    await fetch("https://api.twitter.com/2/users/me", { headers }),
    "X identity",
  );
  const userId = String(((me["data"] ?? {}) as { id?: string }).id ?? "");
  if (!userId) throw new Error("X did not return the authenticated user id.");

  const json = await readJson(
    await fetch(
      `https://api.twitter.com/2/users/${userId}/mentions?max_results=${Math.max(5, Math.min(limit, 100))}&tweet.fields=created_at,author_id`,
      { headers },
    ),
    "X read",
  );
  const rows = (json["data"] ?? []) as Array<Record<string, string>>;
  return rows.map((row) => ({
    id: String(row["id"]),
    provider: "x" as const,
    text: row["text"] ?? "",
    author: row["author_id"] ?? null,
    permalink: `https://x.com/i/web/status/${row["id"]}`,
    createdAt: row["created_at"] ?? null,
  }));
}

export async function publishSocial(
  provider: SocialProvider,
  text: string,
  options: { imageUrl?: string; linkUrl?: string },
): Promise<SocialPublishResult> {
  if (provider === "facebook") return publishToFacebook(text, options.linkUrl);
  if (provider === "x") return publishToX(text);
  if (!options.imageUrl) {
    throw new Error("Instagram requires a public image URL to publish.");
  }
  return publishToInstagram(text, options.imageUrl);
}

export async function readSocial(provider: SocialProvider, limit: number): Promise<SocialItem[]> {
  if (provider === "facebook") return readFacebookFeed(limit);
  if (provider === "instagram") return readInstagramMedia(limit);
  return readXMentions(limit);
}

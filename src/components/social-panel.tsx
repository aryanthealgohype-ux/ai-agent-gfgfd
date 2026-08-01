import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, RefreshCw, Instagram, Facebook, Twitter } from "lucide-react";
import { getSocialStatus, publishSocialPost, readSocialInbox } from "@/lib/social.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Provider = "facebook" | "instagram" | "x";

const ICON: Record<Provider, typeof Instagram> = {
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
};

export function SocialPanel() {
  const fetchStatus = useServerFn(getSocialStatus);
  const publish = useServerFn(publishSocialPost);
  const readInbox = useServerFn(readSocialInbox);

  const [provider, setProvider] = useState<Provider>("facebook");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const { data: channels = [] } = useQuery({
    queryKey: ["social-status"],
    queryFn: () => fetchStatus(),
  });

  const active = useMemo(
    () => channels.find((channel) => channel.provider === provider),
    [channels, provider],
  );

  const inbox = useMutation({
    mutationFn: () => readInbox({ data: { provider, limit: 10 } }),
    onError: (error: Error) => toast.error(error.message),
  });

  const send = useMutation({
    mutationFn: () =>
      publish({
        data: {
          provider,
          text,
          ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
          ...(linkUrl.trim() ? { linkUrl: linkUrl.trim() } : {}),
        },
      }),
    onSuccess: (result) => {
      toast.success(`Published to ${active?.label ?? provider}`, {
        description: result.permalink ?? `Post id ${result.id}`,
      });
      setText("");
      setImageUrl("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Social channels</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pull recent posts and mentions in as agent input, and publish approved agent output back
          out. Tokens stay server-side.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {channels.map((channel) => {
            const Icon = ICON[channel.provider];
            const selected = provider === channel.provider;
            return (
              <button
                key={channel.provider}
                type="button"
                onClick={() => setProvider(channel.provider)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{channel.label}</span>
                <Badge
                  variant={channel.canPublish ? "default" : "outline"}
                  className="text-[9px] uppercase"
                >
                  {channel.canPublish ? "ready" : "no keys"}
                </Badge>
              </button>
            );
          })}
        </div>

        {active && !active.canPublish && (
          <p className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            Missing server secrets: {active.requires.join(", ")}. Add them, then this channel goes
            live for every agent that requires it.
          </p>
        )}

        <div className="space-y-2">
          <Textarea
            rows={4}
            placeholder={`What should the agent publish to ${active?.label ?? "this channel"}?`}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {active?.needsImage && (
              <Input
                placeholder="Public image URL (required for Instagram)"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
            )}
            {provider === "facebook" && (
              <Input
                placeholder="Link to attach (optional)"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!text.trim() || send.isPending || !active?.canPublish}
              onClick={() => send.mutate()}
            >
              <Send className="size-4" /> {send.isPending ? "Publishing…" : "Publish"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={inbox.isPending || !active?.canRead}
              onClick={() => inbox.mutate()}
            >
              <RefreshCw className={cn("size-4", inbox.isPending && "animate-spin")} /> Read latest
            </Button>
          </div>
        </div>

        {Boolean(inbox.data?.length) && (
          <div className="space-y-2 border-t border-border pt-3">
            {inbox.data!.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <p className="text-sm text-foreground">{item.text}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{item.author ?? "unknown"}</span>
                  {item.createdAt && <span>{new Date(item.createdAt).toLocaleString()}</span>}
                  {item.permalink && (
                    <a
                      href={item.permalink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline"
                    >
                      open
                    </a>
                  )}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => {
                      setText(item.text);
                      toast.success("Loaded into the composer as agent input");
                    }}
                  >
                    use as input
                  </button>
                </p>
              </div>
            ))}
          </div>
        )}
        {inbox.data?.length === 0 && (
          <p className="text-xs text-muted-foreground">No recent items returned.</p>
        )}
      </CardContent>
    </Card>
  );
}

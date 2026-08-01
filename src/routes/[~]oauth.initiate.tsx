import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/~oauth/initiate")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});

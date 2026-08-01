import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/~auth/initiate")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});

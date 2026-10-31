import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile/")({
  beforeLoad: ({ context }) => {
    const session = context.session;
    const accountId = session?.user?.name ?? session?.user?.id;
    if (accountId) {
      throw redirect({ to: "/profile/$accountId", params: { accountId } });
    }
    throw redirect({ to: "/" });
  },
});

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { type SessionData, sessionQueryOptions, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";

type SearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/_layout/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const initialSession = context.session as SessionData | null | undefined;
    const session = initialSession ?? context.queryClient.getQueryData(["session"]);

    if (session?.user) {
      throw redirect({ to: search.redirect?.startsWith("/") ? search.redirect : "/", search: {} });
    }
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(
      sessionQueryOptions(context.authClient, context.session),
    );
  },
  component: LoginPage,
});

function LoginPage() {
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const { redirect } = Route.useSearch();

  if (session?.user) {
    const redirectTo = redirect?.startsWith("/") ? redirect : "/";
    return <Navigate to={redirectTo} replace search={{}} />;
  }

  return (
    <div className="min-h-[70vh] w-full flex items-start justify-center px-6 pt-[15vh] animate-fade-in">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to Crosspost</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your NEAR wallet to get started
          </p>
        </div>

        <div className="space-y-3">
          <Button disabled className="w-full" size="lg">
            Connect NEAR Wallet
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button disabled className="w-full" size="lg">
            Continue as Guest
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Connect your NEAR wallet for secure, decentralized authentication
        </p>
      </div>
    </div>
  );
}

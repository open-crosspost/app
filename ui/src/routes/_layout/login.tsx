import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  getRedirectUrl,
  NEAR_ERROR_MESSAGES,
  NearAuthError,
  type NearAuthErrorCode,
  type SessionData,
  sessionQueryKey,
  sessionQueryOptions,
  signInAnonymous,
  signInWithNear,
  useAuthClient,
} from "@/app";
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
      throw redirect({ to: getRedirectUrl(search.redirect), search: {} });
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const { redirect } = Route.useSearch();

  const handleSuccess = async (message: string) => {
    const { data: freshSession } = await authClient.getSession();
    if (freshSession) {
      queryClient.setQueryData(["session"], freshSession);
    }
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await router.invalidate();
    toast.success(message);
  };

  const nearMutation = useMutation({
    mutationFn: () => signInWithNear(authClient),
    onSuccess: () => handleSuccess("Signed in with NEAR"),
    onError: (error) => {
      if (error instanceof NearAuthError && error.code in NEAR_ERROR_MESSAGES) {
        toast.error(NEAR_ERROR_MESSAGES[error.code as NearAuthErrorCode]);
      } else {
        toast.error(error.message || "Failed to sign in");
      }
    },
  });

  const anonymousMutation = useMutation({
    mutationFn: () => signInAnonymous(authClient),
    onSuccess: () => handleSuccess("Signed in anonymously"),
    onError: (error) => {
      toast.error(error.message || "Failed to sign in anonymously");
    },
  });

  const isPending = nearMutation.isPending || anonymousMutation.isPending;

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
          <Button
            onClick={() => nearMutation.mutate()}
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {nearMutation.isPending ? "Connecting..." : "Connect NEAR Wallet"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            onClick={() => anonymousMutation.mutate()}
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {anonymousMutation.isPending ? "Signing in..." : "Continue as Guest"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Connect your NEAR wallet for secure, decentralized authentication
        </p>
      </div>
    </div>
  );
}

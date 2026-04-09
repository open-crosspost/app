import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Navigate,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/app";
import { Button } from "@/components/ui/button";
import type { SessionData } from "@/lib/session";
import { sessionQueryOptions } from "@/lib/session";

type SearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/_layout/login")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const { queryClient } = context;
    const initialSession = context.session as SessionData | undefined | null;
    const session =
      initialSession ??
      (queryClient.getQueryData(sessionQueryOptions(initialSession).queryKey) as
        | SessionData
        | null
        | undefined);

    if (session?.user) {
      const redirectTo = search.redirect?.startsWith("/") ? search.redirect : "/crosspost";
      throw redirect({ to: redirectTo, search: {} });
    }
  },
  loader: ({ context }) => {
    const initialSession = context.session as SessionData | undefined | null;
    void context.queryClient.prefetchQuery(sessionQueryOptions(initialSession));
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();
  const { data: session } = useQuery(sessionQueryOptions());

  const handleSuccess = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
    router.invalidate();
    const redirectTo = redirect?.startsWith("/") ? redirect : "/crosspost";
    navigate({ to: redirectTo, replace: true, search: {} });
    toast.success(message);
  };

  const nearMutation = useMutation({
    mutationFn: async () => {
      return new Promise<void>((resolve, reject) => {
        authClient.signIn.near({
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
    },
    onSuccess: () => handleSuccess("Signed in with NEAR"),
    onError: (error: { code?: string; message?: string }) => {
      if (error.code === "UNAUTHORIZED_NONCE_REPLAY") {
        toast.error("Sign-in already used");
      } else if (error.code === "UNAUTHORIZED_INVALID_SIGNATURE") {
        toast.error("Invalid signature");
      } else if (error.code === "SIGNER_NOT_AVAILABLE") {
        toast.error("NEAR wallet not available");
      } else {
        toast.error(error.message || "Failed to sign in");
      }
    },
  });

  if (session?.user) {
    const redirectTo = redirect?.startsWith("/") ? redirect : "/crosspost";
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

        <Button
          onClick={() => nearMutation.mutate()}
          disabled={nearMutation.isPending}
          className="w-full"
          size="lg"
        >
          {nearMutation.isPending ? "Connecting..." : "Connect NEAR Wallet"}
        </Button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Connect your NEAR wallet for secure, decentralized authentication
        </p>
      </div>
    </div>
  );
}

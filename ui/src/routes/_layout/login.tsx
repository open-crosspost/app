import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { queryClient } from "../../utils/orpc";

type SearchParams = {
  redirect?: string;
};

type AuthMethod = "near" | "email" | "phone" | "passkey" | "anonymous";

export const Route = createFileRoute("/_layout/login")({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        throw redirect({ to: search.redirect || "/" });
      }
    } catch (error) {
      if ((error as { isRedirect?: boolean })?.isRedirect) throw error;
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("near");
  const [isLoading, setIsLoading] = useState(false);

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Phone form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // NEAR Sign In
  const handleNearSignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.near({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["session"] });
          router.invalidate();
          navigate({ to: redirect ?? "/", replace: true });
          toast.success("Signed in with NEAR");
        },
        onError: (error) => {
          setIsLoading(false);
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
    } catch (error) {
      setIsLoading(false);
      toast.error("Authentication failed");
    }
  };

  // Passkey Sign In
  const handlePasskeySignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.passkey({
        autoFill: false,
        fetchOptions: {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session"] });
            router.invalidate();
            navigate({ to: redirect ?? "/", replace: true });
            toast.success("Signed in with passkey");
          },
          onError: (ctx) => {
            setIsLoading(false);
            toast.error(ctx.error?.message || "Passkey sign in failed");
          },
        },
      });
    } catch (error) {
      setIsLoading(false);
      toast.error("Passkey authentication failed");
    }
  };

  // Anonymous Sign In
  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.anonymous({
        fetchOptions: {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session"] });
            router.invalidate();
            navigate({ to: redirect ?? "/", replace: true });
            toast.success("Started anonymous session");
          },
          onError: (ctx) => {
            setIsLoading(false);
            toast.error(ctx.error?.message || "Anonymous sign in failed");
          },
        },
      });
    } catch (error) {
      setIsLoading(false);
      toast.error("Anonymous session failed");
    }
  };

  // Email Sign In
  const handleEmailSignIn = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.signIn.email({
        email,
        password,
        fetchOptions: {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session"] });
            router.invalidate();
            navigate({ to: redirect ?? "/", replace: true });
            toast.success("Signed in successfully");
          },
          onError: (ctx) => {
            setIsLoading(false);
            toast.error(ctx.error?.message || "Sign in failed");
          },
        },
      });
    } catch (error) {
      setIsLoading(false);
      toast.error("Authentication failed");
    }
  };

  // Email Sign Up
  const handleEmailSignUp = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.signUp.email({
        email,
        password,
        name: email.split("@")[0],
        fetchOptions: {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session"] });
            router.invalidate();
            navigate({ to: redirect ?? "/", replace: true });
            toast.success("Account created! Check your email to verify.");
          },
          onError: (ctx) => {
            setIsLoading(false);
            toast.error(ctx.error?.message || "Sign up failed");
          },
        },
      });
    } catch (error) {
      setIsLoading(false);
      toast.error("Sign up failed");
    }
  };

  // Phone OTP - Send Code
  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.phoneNumber.sendOtp({
        phoneNumber,
        fetchOptions: {
          onSuccess: () => {
            setOtpSent(true);
            setIsLoading(false);
            toast.success("Verification code sent!");
          },
          onError: (ctx) => {
            setIsLoading(false);
            toast.error(ctx.error?.message || "Failed to send code");
          },
        },
      });
    } catch (error) {
      setIsLoading(false);
      toast.error("Failed to send verification code");
    }
  };

  // Phone OTP - Verify and Sign In
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.phoneNumber.verify({
        phoneNumber,
        code: otpCode,
        fetchOptions: {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session"] });
            router.invalidate();
            navigate({ to: redirect ?? "/", replace: true });
            toast.success("Signed in with phone");
          },
          onError: (ctx: { error?: { message?: string } }) => {
            setIsLoading(false);
            toast.error(ctx.error?.message || "Invalid code");
          },
        },
      });
    } catch (error) {
      setIsLoading(false);
      toast.error("Verification failed");
    }
  };

  const renderAuthMethod = () => {
    switch (authMethod) {
      case "near":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect your NEAR wallet for on-chain identity
            </p>
            <button
              type="button"
              onClick={handleNearSignIn}
              disabled={isLoading}
              className="w-full px-6 py-4 text-sm font-mono border border-border hover:border-[#00EC97] bg-muted/20 hover:bg-muted/40 transition-all rounded-lg disabled:opacity-50"
            >
              {isLoading ? "connecting..." : "connect NEAR wallet"}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Recommended for blockchain features
            </p>
          </div>
        );

      case "passkey":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Use Face ID, Touch ID, or security key
            </p>
            <button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={isLoading}
              className="w-full px-6 py-4 text-sm font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-lg disabled:opacity-50"
            >
              {isLoading ? "authenticating..." : "sign in with passkey"}
            </button>
          </div>
        );

      case "anonymous":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Start without creating an account
            </p>
            <button
              type="button"
              onClick={handleAnonymousSignIn}
              disabled={isLoading}
              className="w-full px-6 py-4 text-sm font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-lg disabled:opacity-50"
            >
              {isLoading ? "starting..." : "continue anonymously"}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Data will be lost when you sign out
            </p>
          </div>
        );

      case "email":
        return (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-3 text-sm font-mono bg-background border border-border focus:border-ring rounded-lg outline-none transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full px-4 py-3 text-sm font-mono bg-background border border-border focus:border-ring rounded-lg outline-none transition-colors"
            />
            <button
              type="button"
              onClick={isSignUp ? handleEmailSignUp : handleEmailSignIn}
              disabled={isLoading}
              className="w-full px-6 py-4 text-sm font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-lg disabled:opacity-50"
            >
              {isLoading ? (isSignUp ? "creating..." : "signing in...") : (isSignUp ? "create account" : "sign in")}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>
        );

      case "phone":
        return (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 text-sm font-mono bg-background border border-border focus:border-ring rounded-lg outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full px-6 py-4 text-sm font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-lg disabled:opacity-50"
                >
                  {isLoading ? "sending..." : "send code"}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Enter your phone number to receive a verification code
                </p>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-sm font-mono bg-background border border-border focus:border-ring rounded-lg outline-none transition-colors text-center tracking-widest"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                  className="w-full px-6 py-4 text-sm font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-lg disabled:opacity-50"
                >
                  {isLoading ? "verifying..." : "verify & sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(""); }}
                  className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  Use different phone number
                </button>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Auth Method Selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {(["near", "email", "phone", "passkey", "anonymous"] as AuthMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setAuthMethod(method)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                authMethod === method
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Active Auth Method */}
        {renderAuthMethod()}

        {/* Link to other auth methods */}
        <div className="pt-4 border-t border-border/50 space-y-3">
          <p className="text-xs text-muted-foreground text-center">Already have an account?</p>
          <div className="flex justify-center gap-4">
            <Link
              to="/"
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              explore first
            </Link>
          </div>
        </div>

        {/* Info about NEAR */}
        {authMethod !== "near" && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              You can link a NEAR wallet later for on-chain features
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

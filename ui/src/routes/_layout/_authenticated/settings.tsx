import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../../lib/auth-client";

export const Route = createFileRoute("/_layout/_authenticated/settings")({
  loader: async () => {
    const { data: session } = await authClient.getSession();
    return { session };
  },
  head: () => ({
    meta: [
      { title: "Account Settings | demo.everything" },
      { name: "description", content: "Manage your account and authentication methods." },
    ],
  }),
  component: AccountSettings,
});

function AccountSettings() {
  const router = useRouter();
  const { session } = Route.useLoaderData() as { session: { user: { id: string; email?: string; name?: string; isAnonymous?: boolean } } | null };
  const [activeSection, setActiveSection] = useState<"profile" | "auth" | "security">("profile");

  if (!session?.user) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-mono">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Not authenticated</p>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/50">
        <div>
          <button
            type="button"
            onClick={() => router.history.back()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            ← back
          </button>
          <h1 className="text-lg font-mono mt-2">Account Settings</h1>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border/50 pb-4">
        <button
          type="button"
          onClick={() => setActiveSection("profile")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
            activeSection === "profile"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
          }`}
        >
          profile
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("auth")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
            activeSection === "auth"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
          }`}
        >
          auth methods
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("security")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
            activeSection === "security"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
          }`}
        >
          security
        </button>
      </div>

      {activeSection === "profile" && <ProfileSection user={user} />}
      {activeSection === "auth" && <AuthMethodsSection user={user} />}
      {activeSection === "security" && <SecuritySection user={user} router={router} />}
    </div>
  );
}

function ProfileSection({ user }: { user: { id: string; email?: string; name?: string; isAnonymous?: boolean } }) {
  const [name, setName] = useState(user.name || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const { error } = await authClient.updateUser({
        name,
      });
      if (error) throw new Error(error.message);
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono">Profile Information</h2>

      <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-mono text-muted-foreground">User ID</label>
          <input
            type="text"
            value={user.id}
            disabled
            className="w-full px-3 py-2 text-sm font-mono bg-muted/50 border border-border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-muted-foreground">Email</label>
          <input
            type="email"
            value={user.email || "No email"}
            disabled
            className="w-full px-3 py-2 text-sm font-mono bg-muted/50 border border-border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-muted-foreground">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating || name === user.name}
          className="px-4 py-2 text-sm font-mono bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 transition-colors"
        >
          {isUpdating ? "updating..." : "update profile"}
        </button>
      </div>

      {user.isAnonymous && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm font-mono text-yellow-600">Anonymous Account</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your data will be lost when you sign out. Consider linking an email or NEAR account to save your progress.
          </p>
        </div>
      )}
    </div>
  );
}

function AuthMethodsSection({ user }: { user: { id: string; email?: string; name?: string; isAnonymous?: boolean } }) {
  const { data: passkeys } = useSuspenseQuery({
    queryKey: ["passkeys"],
    queryFn: async () => {
      const { data } = await authClient.passkey.listUserPasskeys();
      return data || [];
    },
  });

  const [isAddingPasskey, setIsAddingPasskey] = useState(false);

  const handleAddPasskey = async () => {
    setIsAddingPasskey(true);
    try {
      const { error } = await authClient.passkey.addPasskey();
      if (error) throw new Error(error.message);
      toast.success("Passkey added successfully");
    } catch (err) {
      toast.error("Failed to add passkey");
    } finally {
      setIsAddingPasskey(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono">Authentication Methods</h2>

      {/* Email/Password */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-mono">Email & Password</p>
              <p className="text-xs text-muted-foreground">{user.email || "Not configured"}</p>
            </div>
          </div>
          {!user.email && (
            <button
              type="button"
              className="px-2 py-1 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded"
            >
              add email
            </button>
          )}
        </div>
      </div>

      {/* Passkey */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-mono">Passkeys</p>
              <p className="text-xs text-muted-foreground">{passkeys?.length || 0} registered</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddPasskey}
            disabled={isAddingPasskey}
            className="px-2 py-1 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded disabled:opacity-50"
          >
            {isAddingPasskey ? "adding..." : "add passkey"}
          </button>
        </div>

        {passkeys && passkeys.length > 0 && (
          <div className="space-y-2 mt-4">
            {passkeys.map((passkey: { id: string; name?: string }) => (
              <div key={passkey.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-xs font-mono">{passkey.name || "Passkey"}</span>
                <button
                  type="button"
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEAR */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-mono">NEAR Wallet</p>
              <p className="text-xs text-muted-foreground">Not linked</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await authClient.signIn.near();
                toast.success("NEAR wallet linked");
              } catch {
                toast.error("Failed to link NEAR wallet");
              }
            }}
            className="px-2 py-1 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded"
          >
            link NEAR
          </button>
        </div>
      </div>

      {/* Phone */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-mono">Phone Number</p>
              <p className="text-xs text-muted-foreground">Not configured</p>
            </div>
          </div>
          <button
            type="button"
            className="px-2 py-1 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded"
          >
            add phone
          </button>
        </div>
      </div>
    </div>
  );
}

function SecuritySection({ user, router }: { user: { id: string; email?: string; name?: string; isAnonymous?: boolean }; router: ReturnType<typeof useRouter> }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChanging(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (error) throw new Error(error.message);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error("Failed to change password");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono">Security</h2>

      {user.email && (
        <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-4">
          <h3 className="text-xs font-mono text-muted-foreground">Change Password</h3>

          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
          />

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
          />

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 text-sm font-mono bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 transition-colors"
          >
            {isChanging ? "changing..." : "change password"}
          </button>
        </div>
      )}

      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <h3 className="text-xs font-mono text-muted-foreground mb-4">Sessions</h3>
        <button
          type="button"
          onClick={async () => {
            try {
              await authClient.revokeSessions();
              toast.success("All other sessions revoked");
            } catch {
              toast.error("Failed to revoke sessions");
            }
          }}
          className="px-4 py-2 text-sm font-mono border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          revoke other sessions
        </button>
      </div>

      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
        <h3 className="text-xs font-mono text-destructive mb-2">Danger Zone</h3>
        <button
          type="button"
          onClick={async () => {
            if (confirm("Are you sure you want to sign out?")) {
              await authClient.signOut();
              router.navigate({ to: "/" });
            }
          }}
          className="px-4 py-2 text-sm font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors"
        >
          sign out
        </button>
      </div>
    </div>
  );
}

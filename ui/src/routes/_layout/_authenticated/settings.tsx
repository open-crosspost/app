import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  sessionQueryOptions,
  passkeysQueryOptions,
  updateProfile,
  changePassword,
  revokeOtherSessions,
  addPasskey,
  removePasskey,
  linkNearWallet,
} from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | demo.everything" },
      { name: "description", content: "Manage your account and authentication methods." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: passkeys } = useQuery(passkeysQueryOptions());
  
  const user = session?.user;
  const nearAccountId = authClient.near.getAccountId();

  if (!user) {
    return (
      <div className="space-y-6">
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-lg font-mono">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage your identity and authentication methods
        </p>
      </section>

      <ProfileSection user={user} />
      
      <AuthMethodsSection 
        user={user} 
        passkeys={passkeys || []}
        nearAccountId={nearAccountId}
      />
      
      <SecuritySection user={user} />
    </div>
  );
}

function ProfileSection({ user }: { user: { id: string; email?: string; name?: string; isAnonymous?: boolean } }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name || "");

  const updateMutation = useMutation({
    mutationFn: () => updateProfile(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      toast.success("Profile updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
        profile
      </h2>
      
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-xs font-mono">
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-muted-foreground text-right w-32">id</td>
                <td className="px-4 py-3">
                  <code className="text-xs">{user.id}</code>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-muted-foreground text-right">email</td>
                <td className="px-4 py-3">
                  {user.email ? (
                    <span>{user.email}</span>
                  ) : (
                    <span className="text-muted-foreground">not linked</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-muted-foreground text-right">name</td>
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-7 text-xs"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-muted-foreground text-right">type</td>
                <td className="px-4 py-3">
                  {user.isAnonymous ? (
                    <span className="text-muted-foreground">anonymous</span>
                  ) : (
                    <span>standard</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || name === user.name}
          variant="outline"
          size="sm"
        >
          {updateMutation.isPending ? "saving..." : "save"}
        </Button>
      </div>

      {user.isAnonymous && (
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              Your data will be lost when you sign out. Link an email or NEAR wallet to save your progress.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function AuthMethodsSection({ 
  user, 
  passkeys, 
  nearAccountId 
}: { 
  user: { email?: string; isAnonymous?: boolean };
  passkeys: Array<{ id: string; name?: string }>;
  nearAccountId: string | null;
}) {
  const queryClient = useQueryClient();

  const addPasskeyMutation = useMutation({
    mutationFn: addPasskey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: passkeysQueryOptions().queryKey });
      toast.success("Passkey added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removePasskeyMutation = useMutation({
    mutationFn: (passkeyId: string) => removePasskey(passkeyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: passkeysQueryOptions().queryKey });
      toast.success("Passkey removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const linkNearMutation = useMutation({
    mutationFn: linkNearWallet,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      toast.success("NEAR wallet linked");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
        auth methods
      </h2>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-xs font-mono">
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-muted-foreground text-right w-32">email</td>
                <td className="px-4 py-3">
                  {user.email ? (
                    <span>{user.email}</span>
                  ) : (
                    <span className="text-muted-foreground">not linked</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-muted-foreground text-right">near</td>
                <td className="px-4 py-3">
                  {nearAccountId ? (
                    <code className="text-xs">{nearAccountId}</code>
                  ) : (
                    <Button
                      onClick={() => linkNearMutation.mutate()}
                      disabled={linkNearMutation.isPending}
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 py-0 text-xs font-mono text-muted-foreground hover:text-foreground"
                    >
                      {linkNearMutation.isPending ? "linking..." : "link wallet →"}
                    </Button>
                  )}
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-muted-foreground text-right">phone</td>
                <td className="px-4 py-3">
                  <span className="text-muted-foreground">not linked</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-muted-foreground text-right align-top">passkeys</td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    {passkeys.length > 0 ? (
                      passkeys.map((passkey) => (
                        <div key={passkey.id} className="flex items-center justify-between">
                          <span>{passkey.name || "Passkey"}</span>
                          <Button
                            onClick={() => removePasskeyMutation.mutate(passkey.id)}
                            disabled={removePasskeyMutation.isPending}
                            variant="ghost"
                            size="sm"
                            className="h-auto px-0 py-0 text-xs font-mono text-muted-foreground hover:text-foreground"
                          >
                            remove
                          </Button>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">none registered</span>
                    )}
                    <Button
                      onClick={() => addPasskeyMutation.mutate()}
                      disabled={addPasskeyMutation.isPending}
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 py-0 text-xs font-mono text-muted-foreground hover:text-foreground"
                    >
                      {addPasskeyMutation.isPending ? "adding..." : "add passkey →"}
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function SecuritySection({ user }: { user: { email?: string; isAnonymous?: boolean } }) {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      return changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => toast.success("Other sessions revoked"),
    onError: (err: Error) => toast.error(err.message),
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      await authClient.near.disconnect().catch(() => {});
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
        security
      </h2>

      {user.email && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs font-mono">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right w-32">current</td>
                  <td className="px-4 py-3">
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right">new</td>
                  <td className="px-4 py-3">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right">confirm</td>
                  <td className="px-4 py-3">
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="p-4">
              <Button
                onClick={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                variant="outline"
                size="sm"
              >
                {changePasswordMutation.isPending ? "changing..." : "change password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono">other sessions</p>
              <p className="text-xs text-muted-foreground mt-1">Revoke all other active sessions</p>
            </div>
            <Button
              onClick={() => revokeSessionsMutation.mutate()}
              disabled={revokeSessionsMutation.isPending}
              variant="outline"
              size="sm"
            >
              {revokeSessionsMutation.isPending ? "revoking..." : "revoke"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono">sign out</p>
              <p className="text-xs text-muted-foreground mt-1">End your current session</p>
            </div>
            <Button
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
              variant="outline"
              size="sm"
            >
              {signOutMutation.isPending ? "signing out..." : "sign out"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

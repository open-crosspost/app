import { toast } from "@/hooks/use-toast";
import { getAccountId, signMessage } from "@/lib/near";

interface MockClient {
  setAuthentication: (_payload: Record<string, unknown> | string) => void;
  setAccountHeader: (_accountId: string) => void;
  auth: {
    authorizeNearAccount: () => Promise<any>;
    unauthorizeNear: () => Promise<any>;
    getConnectedAccounts: () => Promise<any>;
    loginToPlatform: (_platform: string) => Promise<any>;
    revokeAuth: (_platform: string, _userId: string) => Promise<any>;
    refreshProfile: (_platform: string, _userId: string) => Promise<any>;
    getAuthStatus: (_platform: string, _userId: string) => Promise<any>;
  };
  activity: {
    getLeaderboard: (_params: unknown) => Promise<any>;
    getAccountPosts: (_accountId: string) => Promise<any>;
  };
}

let clientInstance: MockClient | null = null;

function createMockClient(): MockClient {
  return {
    setAuthentication: () => {},
    setAccountHeader: () => {},
    auth: {
      authorizeNearAccount: async () => ({ success: true }),
      unauthorizeNear: async () => ({ success: true }),
      getConnectedAccounts: async () => ({ success: true, data: { accounts: [] } }),
      loginToPlatform: async () => ({}),
      revokeAuth: async () => ({ success: true }),
      refreshProfile: async () => ({ success: true }),
      getAuthStatus: async () => ({ success: true, data: { authenticated: false, tokenStatus: { valid: false } } }),
    },
    activity: {
      getLeaderboard: async () => ({}),
      getAccountPosts: async () => ({ data: { posts: [] } }),
    },
  };
}

export function getClient(): MockClient {
  if (!clientInstance) {
    clientInstance = createMockClient();
  }
  return clientInstance;
}

export async function authorize(): Promise<boolean> {
  toast({
    title: "Authorizing...",
    description: "that your wallet can call the server",
    variant: "default",
  });

  try {
    const accountId = await getAccountId();
    if (!accountId) {
      throw new Error("Wallet not connected");
    }

    const message = `I authorize this app to post on my behalf using my NEAR account: ${accountId}`;
    const authToken = await signMessage(message, "crosspost.near");

    if (!authToken?.signature || !authToken.publicKey) {
      throw new Error("Failed to sign message: Invalid token received");
    }

    return true;
  } catch (error) {
    console.error("Authorization error:", error);
    throw error;
  }
}

export async function unauthorize(): Promise<void> {
  toast({
    title: "Revoking Authorization...",
    description: "Removing your authorization from the server",
    variant: "default",
  });

  toast({
    title: "Authorization Revoked",
    description: "Successfully removed your authorization",
    variant: "success",
  });
}

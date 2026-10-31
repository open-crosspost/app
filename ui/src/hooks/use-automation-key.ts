import { NearConnector } from "@hot-labs/near-connect";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient, useAuthClient } from "@/app";
import { NETWORK_ID } from "@/config";
import { automationKeyQueryKey } from "@/lib/social";

export type AutomationKeyStatus = {
  nearAccountId: string | null;
  publicKey: string | null;
  status: "pending_grant" | "active" | "revoked" | null;
};

const ALLOWANCE_YOCTO = "250000000000000000000000000";

export function useAutomationKey(statusQueryEnabled: boolean) {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: automationKeyQueryKey,
    queryFn: () => apiClient.social.automation.keyStatus(),
    enabled: !!session?.user && statusQueryEnabled,
    staleTime: 30_000,
  });

  const grant = useMutation({
    mutationFn: async () => {
      const prepared = await apiClient.social.automation.keyPrepare();
      if (prepared.status !== "active") {
        await grantViaWallet(prepared.nearAccountId, prepared.publicKey);
        await apiClient.social.automation.keyGrant({});
      }
      return apiClient.social.automation.keyStatus();
    },
    onSuccess: (next) => {
      queryClient.setQueryData(automationKeyQueryKey, next);
    },
  });

  const revoke = useMutation({
    mutationFn: () => apiClient.social.automation.keyRevoke(),
    onSuccess: (next) => {
      queryClient.setQueryData(automationKeyQueryKey, next);
    },
  });

  return { status, grant, revoke };
}

async function grantViaWallet(nearAccountId: string, publicKey: string) {
  const connector = new NearConnector({ network: NETWORK_ID });
  const { wallet } = await connector.getConnectedWallet();
  await wallet.signAndSendTransaction({
    receiverId: nearAccountId,
    actions: [
      {
        type: "AddKey",
        params: {
          publicKey,
          accessKey: {
            permission: {
              receiverId: "social",
              methodNames: ["__fastdata_kv"],
              allowance: ALLOWANCE_YOCTO,
            },
          },
        },
      },
    ],
  });
}

export type NetworkId = "mainnet" | "testnet";

export interface FastKvEntry {
  current_account_id: string;
  predecessor_id: string;
  key: string;
  value: unknown;
  block_height?: number;
  block_timestamp?: number;
  tx_hash?: string;
  signer_id?: string;
  action_index?: number;
  receipt_id?: string;
}

interface FastKvListResponse {
  entries?: Array<FastKvEntry | null>;
  page_token?: string;
}

interface FastKvListOptions {
  baseUrl: string;
  currentAccountId: string;
  predecessorId?: string;
  key?: string;
  keyPrefix?: string;
  pageToken?: string;
  limit?: number;
  includeMetadata?: boolean;
}

const FASTKV_TIMEOUT_MS = 10_000;

export const FASTKV_REGISTRY_NAMESPACE: Record<NetworkId, string> = {
  mainnet: process.env.REGISTRY_FASTKV_MAINNET_NAMESPACE || "registry.everything.near",
  testnet: process.env.REGISTRY_FASTKV_TESTNET_NAMESPACE || "registry.everything.testnet",
};

export function getNetworkIdForAccount(accountId: string): NetworkId {
  return accountId.endsWith(".testnet") ? "testnet" : "mainnet";
}

export function getFastKvBaseUrlForAccount(accountId: string): string {
  return getFastKvBaseUrlForNetwork(getNetworkIdForAccount(accountId));
}

export function getFastKvBaseUrlForNetwork(network: NetworkId): string {
  return network === "testnet"
    ? process.env.REGISTRY_FASTKV_TESTNET_URL || "https://kv.test.fastnear.com"
    : process.env.REGISTRY_FASTKV_MAINNET_URL || "https://kv.main.fastnear.com";
}

export function getRegistryNamespaceForAccount(accountId: string): string {
  return FASTKV_REGISTRY_NAMESPACE[getNetworkIdForAccount(accountId)];
}

export function getRegistryNamespaceForNetwork(network: NetworkId): string {
  return FASTKV_REGISTRY_NAMESPACE[network];
}

export function getRegistryConfigKey(accountId: string, gatewayId: string): string {
  return `apps/${accountId}/${gatewayId}/bos.config.json`;
}

export function getRegistryMetadataKey(accountId: string, gatewayId: string): string {
  return `apps/${accountId}/${gatewayId}/manifest`;
}

export function parseBosUrl(bosUrl: string): { accountId: string; gatewayId: string } {
  const match = bosUrl.match(/^bos:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid BOS URL format: ${bosUrl}. Expected: bos://{account}/{gateway}`);
  }

  const [, accountId, gatewayId] = match;
  return { accountId, gatewayId };
}

export function buildRegistryConfigUrl(accountId: string, gatewayId: string): string {
  const baseUrl = getFastKvBaseUrlForAccount(accountId);
  const namespace = getRegistryNamespaceForAccount(accountId);
  const key = encodeURIComponent(getRegistryConfigKey(accountId, gatewayId));
  return `${baseUrl}/v0/latest/${encodeURIComponent(namespace)}/${encodeURIComponent(accountId)}/${key}`;
}

export async function fetchBosConfigFromFastKv<T>(bosUrl: string): Promise<T> {
  const { accountId, gatewayId } = parseBosUrl(bosUrl);
  const value = await readLatestValue({
    baseUrl: getFastKvBaseUrlForAccount(accountId),
    currentAccountId: getRegistryNamespaceForAccount(accountId),
    predecessorId: accountId,
    key: getRegistryConfigKey(accountId, gatewayId),
  });

  if (!value) {
    throw new Error(`No config found for ${bosUrl}`);
  }

  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  if (typeof value !== "object") {
    throw new Error(`Invalid config value for ${bosUrl}`);
  }

  return value as T;
}

export async function readLatestValue(options: FastKvListOptions): Promise<unknown | null> {
  const response = await listLatestValues({ ...options, limit: 1 });
  const entry = response.entries.find(Boolean);
  return entry?.value ?? null;
}

export async function listLatestValues(options: FastKvListOptions): Promise<{
  entries: FastKvEntry[];
  pageToken: string | null;
}> {
  const path = options.predecessorId
    ? `/v0/latest/${encodeURIComponent(options.currentAccountId)}/${encodeURIComponent(options.predecessorId)}`
    : `/v0/latest/${encodeURIComponent(options.currentAccountId)}`;
  const url = `${options.baseUrl}${path}`;
  const body: Record<string, unknown> = {
    limit: options.limit ?? 50,
  };

  if (options.key) {
    body.key = options.key;
  }

  if (options.keyPrefix) {
    body.key_prefix = options.keyPrefix;
  }

  if (options.pageToken) {
    body.page_token = options.pageToken;
  }

  if (options.includeMetadata) {
    body.include_metadata = true;
  }

  const payload = await fetchJson<FastKvListResponse>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    entries: (payload?.entries ?? []).filter((entry): entry is FastKvEntry => Boolean(entry)),
    pageToken: payload?.page_token ?? null,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FASTKV_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

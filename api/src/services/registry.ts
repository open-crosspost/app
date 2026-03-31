import { decodeSignedDelegateAction, Near } from "near-kit";
import {
  buildRegistryConfigUrl,
  fetchBosConfigFromFastKv,
  getFastKvBaseUrlForAccount,
  getFastKvBaseUrlForNetwork,
  getNetworkIdForAccount,
  getRegistryConfigKey,
  getRegistryMetadataKey,
  getRegistryNamespaceForAccount,
  getRegistryNamespaceForNetwork,
  listLatestValues,
  type NetworkId,
  readLatestValue,
} from "./fastkv";

type JsonObject = Record<string, unknown>;

type BosConfigInput = {
  extends?: string;
  account?: string;
  domain?: string;
  gateway?: {
    development?: string;
    production?: string;
    account?: string;
  };
  app?: Record<string, JsonObject>;
  shared?: Record<string, Record<string, JsonObject>>;
  template?: string;
  testnet?: string;
};

export interface RegistryListInput {
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface RegistryMetadataDraftInput {
  accountId: string;
  gatewayId: string;
  claimedBy: string;
  title?: string;
  description?: string;
  repoUrl?: string;
  homepageUrl?: string;
  imageUrl?: string;
}

export interface RegistryMetadata {
  claimedBy: string | null;
  title: string | null;
  description: string | null;
  repoUrl: string | null;
  homepageUrl: string | null;
  imageUrl: string | null;
  updatedAt: string | null;
}

export interface RegistryAppSummary {
  accountId: string;
  gatewayId: string;
  canonicalKey: string;
  canonicalConfigUrl: string;
  startCommand: string;
  domain: string | null;
  openUrl: string | null;
  hostUrl: string | null;
  uiUrl: string | null;
  uiSsrUrl: string | null;
  apiUrl: string | null;
  extends: string | null;
  status: "ready" | "invalid";
  metadata: RegistryMetadata | null;
}

export interface RegistryAppDetail extends RegistryAppSummary {
  metadata: RegistryMetadata | null;
  metadataKey: string;
  metadataContractId: string;
  metadataFastKvUrl: string;
  resolvedConfig: JsonObject;
}

export interface PreparedRegistryMetadataWrite {
  contractId: string;
  methodName: "__fastdata_kv";
  key: string;
  manifest: RegistryMetadata;
  args: Record<string, string>;
  gas: string;
  attachedDeposit: string;
}

export interface RegistryRelayResult {
  transactionHash: string | null;
  relayerAccountId: string;
  senderId: string;
}

interface DiscoveredConfig {
  accountId: string;
  gatewayId: string;
  rawConfig: BosConfigInput;
}

const DISCOVERY_PREFIX = "apps/";
const DEFAULT_RELAY_ACCOUNT_ID =
  process.env.REGISTRY_RELAY_ACCOUNT_ID || process.env.NEAR_ACCOUNT_ID || null;
const DEFAULT_RELAY_PRIVATE_KEY =
  process.env.REGISTRY_RELAY_PRIVATE_KEY || process.env.NEAR_PRIVATE_KEY || null;
const DEFAULT_RELAY_NETWORK =
  (process.env.REGISTRY_RELAY_NETWORK as NetworkId | undefined) ||
  (DEFAULT_RELAY_ACCOUNT_ID ? getNetworkIdForAccount(DEFAULT_RELAY_ACCOUNT_ID) : "mainnet");

export async function listRegistryApps(input: RegistryListInput) {
  const limit = clamp(input.limit ?? 24, 1, 100);
  const offset = clamp(parseCursor(input.cursor), 0, Number.MAX_SAFE_INTEGER);
  const discovered = await discoverPublishedConfigs();
  const filtered = discovered.filter(({ accountId, gatewayId }) =>
    matchesQuery(accountId, gatewayId, input.q),
  );
  const page = filtered.slice(offset, offset + limit);
  const data = await Promise.all(page.map(resolveAppSummary));
  const nextOffset = offset + page.length;

  return {
    data,
    meta: {
      total: filtered.length,
      hasMore: nextOffset < filtered.length,
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
    },
  };
}

export async function getRegistryAppsByAccount(accountId: string) {
  const discovered = await discoverPublishedConfigs();
  const matches = discovered.filter((item) => item.accountId === accountId).sort(compareDiscovered);
  const data = await Promise.all(matches.map(resolveAppSummary));

  return {
    data,
    meta: {
      total: data.length,
      hasMore: false,
      nextCursor: null,
    },
  };
}

export async function getRegistryApp(
  accountId: string,
  gatewayId: string,
): Promise<RegistryAppDetail | null> {
  const discovered = await discoverPublishedConfigs();
  const match = discovered.find(
    (item) => item.accountId === accountId && item.gatewayId === gatewayId,
  );

  if (!match) {
    return null;
  }

  const resolved = await resolvePublishedConfig(match.rawConfig);
  const normalized = normalizeResolvedConfig(accountId, gatewayId, resolved);
  const metadataKey = getRegistryMetadataKey(accountId, gatewayId);
  const metadata = await getRegistryMetadata(accountId, gatewayId);

  return {
    ...normalized,
    metadata,
    metadataKey,
    metadataContractId: getRegistryNamespaceForAccount(accountId),
    metadataFastKvUrl: getFastKvBaseUrlForAccount(accountId),
    resolvedConfig: resolved as JsonObject,
  };
}

export async function getRegistryAppByHost(hostUrl: string): Promise<RegistryAppDetail | null> {
  const discovered = await discoverPublishedConfigs();

  for (const item of discovered) {
    const resolved = await resolvePublishedConfig(item.rawConfig);
    const normalized = normalizeResolvedConfig(item.accountId, item.gatewayId, resolved);

    if (normalized.hostUrl !== hostUrl) {
      continue;
    }

    const metadataKey = getRegistryMetadataKey(item.accountId, item.gatewayId);
    const metadata = await getRegistryMetadata(item.accountId, item.gatewayId);

    return {
      ...normalized,
      metadata,
      metadataKey,
      metadataContractId: getRegistryNamespaceForAccount(item.accountId),
      metadataFastKvUrl: getFastKvBaseUrlForAccount(item.accountId),
      resolvedConfig: resolved as JsonObject,
    };
  }

  return null;
}

export async function getRegistryStatus() {
  const discovered = await discoverPublishedConfigs();
  return {
    discoveredApps: discovered.length,
    discoveryKey: `${DISCOVERY_PREFIX}*/bos.config.json`,
    metadataContractId: `${getRegistryNamespaceForNetwork("mainnet")} | ${getRegistryNamespaceForNetwork("testnet")}`,
    metadataFastKvUrl: getFastKvBaseUrlForNetwork("mainnet"),
    relayEnabled: Boolean(DEFAULT_RELAY_ACCOUNT_ID && DEFAULT_RELAY_PRIVATE_KEY),
    relayAccountId: DEFAULT_RELAY_ACCOUNT_ID,
    timestamp: new Date().toISOString(),
  };
}

export function prepareRegistryMetadataWrite(
  input: RegistryMetadataDraftInput,
): PreparedRegistryMetadataWrite {
  const key = getRegistryMetadataKey(input.accountId, input.gatewayId);
  const manifest = buildRegistryManifest(input);

  return {
    contractId: getRegistryNamespaceForAccount(input.accountId),
    methodName: "__fastdata_kv",
    key,
    manifest,
    args: {
      [key]: JSON.stringify(manifest),
    },
    gas: "10 Tgas",
    attachedDeposit: "0 yocto",
  };
}

export async function relayRegistryMetadataWrite(
  signedDelegateActionPayload: string,
): Promise<RegistryRelayResult> {
  if (!DEFAULT_RELAY_ACCOUNT_ID || !DEFAULT_RELAY_PRIVATE_KEY) {
    throw new Error("Registry relay is not configured on this server.");
  }

  const signedDelegate = decodeSignedDelegateAction(signedDelegateActionPayload);
  const senderId = signedDelegate.signedDelegate.delegateAction.senderId;

  const near = new Near({
    network: DEFAULT_RELAY_NETWORK,
    defaultSignerId: DEFAULT_RELAY_ACCOUNT_ID,
    privateKey: DEFAULT_RELAY_PRIVATE_KEY as never,
  });

  const result = await near
    .transaction(DEFAULT_RELAY_ACCOUNT_ID)
    .signedDelegateAction(signedDelegate)
    .send({ waitUntil: "NONE" });

  return {
    transactionHash: result?.transaction?.hash ?? null,
    relayerAccountId: DEFAULT_RELAY_ACCOUNT_ID,
    senderId,
  };
}

export function getRegistryRelaySender(signedDelegateActionPayload: string) {
  const signedDelegate = decodeSignedDelegateAction(signedDelegateActionPayload);
  return signedDelegate.signedDelegate.delegateAction.senderId;
}

async function discoverPublishedConfigs(): Promise<DiscoveredConfig[]> {
  const results = await Promise.all([
    discoverPublishedConfigsForNetwork("mainnet"),
    discoverPublishedConfigsForNetwork("testnet"),
  ]);
  return results.flat().sort(compareDiscovered);
}

async function discoverPublishedConfigsForNetwork(network: NetworkId): Promise<DiscoveredConfig[]> {
  const baseUrl = getFastKvBaseUrlForNetwork(network);
  const currentAccountId = getRegistryNamespaceForNetwork(network);
  const apps: DiscoveredConfig[] = [];
  let pageToken: string | null = null;

  for (;;) {
    const page = await listLatestValues({
      baseUrl,
      currentAccountId,
      keyPrefix: DISCOVERY_PREFIX,
      pageToken: pageToken ?? undefined,
      limit: 200,
    });

    for (const entry of page.entries) {
      if (!entry.key.endsWith("/bos.config.json")) {
        continue;
      }

      const parsedKey = parseRegistryConfigKey(entry.key);
      if (!parsedKey) {
        continue;
      }

      const rawConfig = normalizeConfigValue(entry.value);
      if (!rawConfig) {
        continue;
      }

      apps.push({
        accountId: parsedKey.accountId,
        gatewayId: parsedKey.gatewayId,
        rawConfig,
      });
    }

    if (!page.pageToken) {
      break;
    }

    pageToken = page.pageToken;
  }

  return apps;
}

async function resolveAppSummary(item: DiscoveredConfig): Promise<RegistryAppSummary> {
  const resolved = await resolvePublishedConfig(item.rawConfig);
  const metadata = await getRegistryMetadata(item.accountId, item.gatewayId);

  return {
    ...normalizeResolvedConfig(item.accountId, item.gatewayId, resolved),
    metadata,
  };
}

async function resolvePublishedConfig(config: BosConfigInput): Promise<BosConfigInput> {
  if (!config.extends || !config.extends.startsWith("bos://")) {
    return config;
  }

  return resolveConfigWithExtends(config, new Set());
}

async function resolveConfigWithExtends(
  config: BosConfigInput,
  visited: Set<string>,
): Promise<BosConfigInput> {
  if (!config.extends || !config.extends.startsWith("bos://")) {
    return config;
  }

  if (visited.has(config.extends)) {
    throw new Error(`Circular extends detected for ${config.extends}`);
  }

  const nextVisited = new Set(visited);
  nextVisited.add(config.extends);

  const parent = await fetchBosConfigFromFastKv<BosConfigInput>(config.extends);
  const resolvedParent = await resolveConfigWithExtends(parent, nextVisited);

  return mergeConfigs(resolvedParent, config);
}

function normalizeResolvedConfig(
  accountId: string,
  gatewayId: string,
  config: BosConfigInput,
): RegistryAppSummary {
  const hostConfig = getAppConfig(config, "host");
  const uiConfig = getAppConfig(config, "ui");
  const apiConfig = getAppConfig(config, "api");

  const hostUrl = readString(hostConfig.production);
  const uiUrl = readString(uiConfig.production);
  const apiUrl = readString(apiConfig.production);
  const uiSsrUrl = readString(uiConfig.ssr);
  const domain = readString(config.domain);
  const canonicalKey = getRegistryConfigKey(accountId, gatewayId);

  return {
    accountId,
    gatewayId,
    canonicalKey,
    canonicalConfigUrl: buildRegistryConfigUrl(accountId, gatewayId),
    startCommand: `bos start --account ${accountId} --domain ${gatewayId}`,
    domain,
    openUrl: buildOpenUrl(domain),
    hostUrl,
    uiUrl,
    apiUrl,
    uiSsrUrl,
    extends: typeof config.extends === "string" ? config.extends : null,
    status: hostUrl && uiUrl ? "ready" : "invalid",
    metadata: null,
  };
}

async function getRegistryMetadata(
  accountId: string,
  gatewayId: string,
): Promise<RegistryMetadata | null> {
  const value = await readLatestValue({
    baseUrl: getFastKvBaseUrlForAccount(accountId),
    currentAccountId: getRegistryNamespaceForAccount(accountId),
    predecessorId: accountId,
    key: getRegistryMetadataKey(accountId, gatewayId),
  });

  if (!value) {
    return null;
  }

  const normalized = normalizeMetadataValue(value);

  return {
    claimedBy: accountId,
    title: readString(normalized.title),
    description: readString(normalized.description),
    repoUrl: readString(normalized.repoUrl),
    homepageUrl: readString(normalized.homepageUrl),
    imageUrl: readString(normalized.imageUrl),
    updatedAt: readString(normalized.updatedAt),
  };
}

function buildRegistryManifest(input: RegistryMetadataDraftInput): RegistryMetadata {
  return {
    claimedBy: input.claimedBy,
    title: sanitizeNullable(input.title),
    description: sanitizeNullable(input.description),
    repoUrl: sanitizeNullable(input.repoUrl),
    homepageUrl: sanitizeNullable(input.homepageUrl),
    imageUrl: sanitizeNullable(input.imageUrl),
    updatedAt: new Date().toISOString(),
  };
}

function getAppConfig(config: BosConfigInput, appName: string): JsonObject {
  const app = config.app?.[appName];
  return app && typeof app === "object" ? app : {};
}

function normalizeMetadataValue(value: unknown): JsonObject {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    return parseJson<JsonObject>(value) ?? {};
  }

  if (typeof value === "object") {
    return value as JsonObject;
  }

  return {};
}

function normalizeConfigValue(value: unknown): BosConfigInput | null {
  if (typeof value === "string") {
    return parseJson<BosConfigInput>(value);
  }

  if (value && typeof value === "object") {
    return value as BosConfigInput;
  }

  return null;
}

function parseRegistryConfigKey(key: string): { accountId: string; gatewayId: string } | null {
  const match = key.match(/^apps\/([^/]+)\/([^/]+)\/bos\.config\.json$/);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    accountId: match[1],
    gatewayId: match[2],
  };
}

function mergeConfigs(parent: BosConfigInput, child: BosConfigInput): BosConfigInput {
  const merged: BosConfigInput = { ...parent, ...child };

  if (parent.app || child.app) {
    merged.app = { ...parent.app, ...child.app };
    const parentApps = parent.app || {};
    const childApps = child.app || {};

    for (const key of new Set([...Object.keys(parentApps), ...Object.keys(childApps)])) {
      const parentApp = parentApps[key];
      const childApp = childApps[key];

      if (parentApp && childApp) {
        merged.app[key] = { ...parentApp, ...childApp };
      } else if (childApp) {
        merged.app[key] = childApp;
      } else if (parentApp) {
        merged.app[key] = parentApp;
      }
    }
  }

  if (parent.shared || child.shared) {
    merged.shared = { ...parent.shared, ...child.shared };
    const parentShared = parent.shared || {};
    const childShared = child.shared || {};

    for (const key of new Set([...Object.keys(parentShared), ...Object.keys(childShared)])) {
      const parentValue = parentShared[key];
      const childValue = childShared[key];

      if (parentValue && childValue) {
        merged.shared[key] = { ...parentValue, ...childValue };
      } else if (childValue) {
        merged.shared[key] = childValue;
      } else if (parentValue) {
        merged.shared[key] = parentValue;
      }
    }
  }

  return merged;
}

function matchesQuery(accountId: string, gatewayId: string, query?: string) {
  if (!query) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    accountId.toLowerCase().includes(normalized) || gatewayId.toLowerCase().includes(normalized)
  );
}

function compareDiscovered(a: DiscoveredConfig, b: DiscoveredConfig) {
  return `${a.accountId}/${a.gatewayId}`.localeCompare(`${b.accountId}/${b.gatewayId}`);
}

function parseCursor(cursor?: string) {
  const value = Number(cursor ?? "0");
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function buildOpenUrl(domain: string | null) {
  return domain ? `https://${domain}` : null;
}

function sanitizeNullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

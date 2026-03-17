import { decodeSignedDelegateAction, Near } from "near-kit";
import { Graph } from "near-social-js";

type JsonObject = Record<string, unknown>;

type BosConfigInput = {
  extends?: string;
  account?: string;
  gateway?: {
    development?: string;
    production?: string;
    account?: string;
  };
  app?: Record<string, JsonObject>;
  shared?: Record<string, Record<string, JsonObject>>;
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

interface FastKvWriterEntry {
  accountId?: string;
  value?: unknown;
}

interface DiscoveredConfig {
  accountId: string;
  gatewayId: string;
  rawConfig: BosConfigInput;
}

const DISCOVERY_KEY = "*/bos/gateways/*/bos.config.json";
const DEFAULT_FASTKV_URL = process.env.REGISTRY_FASTKV_URL || "https://fastdata.up.railway.app";
const DEFAULT_FASTKV_CONTRACT_ID = process.env.REGISTRY_FASTKV_CONTRACT_ID || "contextual.near";
const DEFAULT_RELAY_ACCOUNT_ID =
  process.env.REGISTRY_RELAY_ACCOUNT_ID || process.env.NEAR_ACCOUNT_ID || null;
const DEFAULT_RELAY_PRIVATE_KEY =
  process.env.REGISTRY_RELAY_PRIVATE_KEY || process.env.NEAR_PRIVATE_KEY || null;
const DEFAULT_RELAY_NETWORK =
  (process.env.REGISTRY_RELAY_NETWORK as "mainnet" | "testnet" | undefined) || "mainnet";

const graph = new Graph();

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
  const metadataKey = getMetadataKey(accountId, gatewayId);
  const metadata = await getRegistryMetadata(accountId, gatewayId);

  return {
    ...normalized,
    metadata,
    metadataKey,
    metadataContractId: DEFAULT_FASTKV_CONTRACT_ID,
    metadataFastKvUrl: DEFAULT_FASTKV_URL,
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

    const metadataKey = getMetadataKey(item.accountId, item.gatewayId);
    const metadata = await getRegistryMetadata(item.accountId, item.gatewayId);

    return {
      ...normalized,
      metadata,
      metadataKey,
      metadataContractId: DEFAULT_FASTKV_CONTRACT_ID,
      metadataFastKvUrl: DEFAULT_FASTKV_URL,
      resolvedConfig: resolved as JsonObject,
    };
  }

  return null;
}

export async function getRegistryStatus() {
  const discovered = await discoverPublishedConfigs();
  return {
    discoveredApps: discovered.length,
    discoveryKey: DISCOVERY_KEY,
    metadataContractId: DEFAULT_FASTKV_CONTRACT_ID,
    metadataFastKvUrl: DEFAULT_FASTKV_URL,
    relayEnabled: Boolean(DEFAULT_RELAY_ACCOUNT_ID && DEFAULT_RELAY_PRIVATE_KEY),
    relayAccountId: DEFAULT_RELAY_ACCOUNT_ID,
    timestamp: new Date().toISOString(),
  };
}

export function prepareRegistryMetadataWrite(
  input: RegistryMetadataDraftInput,
): PreparedRegistryMetadataWrite {
  const key = getMetadataKey(input.accountId, input.gatewayId);
  const manifest = buildRegistryManifest(input);

  return {
    contractId: DEFAULT_FASTKV_CONTRACT_ID,
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
  const data = await graph.get({ keys: [DISCOVERY_KEY] });

  if (!data || typeof data !== "object") {
    return [];
  }

  const apps: DiscoveredConfig[] = [];

  for (const [accountId, accountValue] of Object.entries(data)) {
    const gateways = (accountValue as JsonObject)?.bos;
    const gatewayMap = (gateways as JsonObject)?.gateways;

    if (!gatewayMap || typeof gatewayMap !== "object") {
      continue;
    }

    for (const [gatewayId, gatewayValue] of Object.entries(gatewayMap)) {
      const serialized = (gatewayValue as JsonObject)?.["bos.config.json"];
      if (typeof serialized !== "string") {
        continue;
      }

      const rawConfig = parseJson<BosConfigInput>(serialized);
      if (!rawConfig) {
        continue;
      }

      apps.push({
        accountId,
        gatewayId,
        rawConfig,
      });
    }
  }

  return apps.sort(compareDiscovered);
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
  if (!config.extends) {
    return config;
  }

  if (!config.extends.startsWith("bos://")) {
    return config;
  }

  return resolveConfigWithExtends(config, new Set());
}

async function resolveConfigWithExtends(
  config: BosConfigInput,
  visited: Set<string>,
): Promise<BosConfigInput> {
  if (!config.extends) {
    return config;
  }

  if (!config.extends.startsWith("bos://")) {
    return config;
  }

  if (visited.has(config.extends)) {
    throw new Error(`Circular extends detected for ${config.extends}`);
  }

  const nextVisited = new Set(visited);
  nextVisited.add(config.extends);

  const parent = await fetchBosConfig(config.extends);
  const resolvedParent = await resolveConfigWithExtends(parent, nextVisited);

  return mergeConfigs(resolvedParent, config);
}

async function fetchBosConfig(bosUrl: string): Promise<BosConfigInput> {
  const configPath = resolveBosUrl(bosUrl);
  const data = await graph.get({ keys: [configPath] });

  if (!data || typeof data !== "object") {
    throw new Error(`No data returned for ${bosUrl}`);
  }

  let current: unknown = data;
  for (const part of configPath.split("/")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      throw new Error(`Missing config path ${configPath}`);
    }
    current = (current as JsonObject)[part];
  }

  if (typeof current !== "string") {
    throw new Error(`Invalid config value at ${configPath}`);
  }

  const parsed = parseJson<BosConfigInput>(current);
  if (!parsed) {
    throw new Error(`Unable to parse config at ${configPath}`);
  }

  return parsed;
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
  const canonicalKey = `${accountId}/bos/gateways/${gatewayId}/bos.config.json`;

  return {
    accountId,
    gatewayId,
    canonicalKey,
    canonicalConfigUrl: `https://near.social/mob.near/widget/State.Inspector?key=${encodeURIComponent(canonicalKey)}`,
    startCommand: `bos start --account ${accountId} --domain ${gatewayId}`,
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
  const metadataKey = getMetadataKey(accountId, gatewayId);
  const url = new URL(`${DEFAULT_FASTKV_URL}/v1/kv/writers`);
  url.searchParams.set("contractId", DEFAULT_FASTKV_CONTRACT_ID);
  url.searchParams.set("key", metadataKey);
  url.searchParams.set("exclude_deleted", "true");
  url.searchParams.set("value_format", "json");
  url.searchParams.set("limit", "20");

  const response = await fetchJson<{ data?: FastKvWriterEntry[] }>(url.toString());
  const writers = Array.isArray(response?.data) ? response.data : [];
  if (writers.length === 0) {
    return null;
  }

  const chosen = writers.find((entry) => entry.accountId === accountId) ?? writers[0];
  const value = normalizeMetadataValue(chosen?.value);

  return {
    claimedBy: typeof chosen?.accountId === "string" ? chosen.accountId : null,
    title: readString(value.title),
    description: readString(value.description),
    repoUrl: readString(value.repoUrl),
    homepageUrl: readString(value.homepageUrl),
    imageUrl: readString(value.imageUrl),
    updatedAt: readString(value.updatedAt),
  };
}

function getMetadataKey(accountId: string, gatewayId: string) {
  return `registry/apps/${accountId}/${gatewayId}/manifest`;
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

function resolveBosUrl(bosUrl: string) {
  const match = bosUrl.match(/^bos:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid BOS URL: ${bosUrl}`);
  }

  const [, account, gateway] = match;
  return `${account}/bos/gateways/${gateway}/bos.config.json`;
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

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
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

function sanitizeNullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

import { encryptOutlayerSecrets } from "./outlayer-ecies";

/**
 * Stores OutLayer secret rows the way `out-layer/outlayer-cli`'s
 * `commands/secrets.rs` does: a per-row keystore pubkey from `/secrets/pubkey`,
 * an ECIES v1 encryption of the JSON, and an on-chain `store_secrets` call the
 * coordinator executes with the wallet's TEE key (`/wallet/v1/call`).
 *
 * The two rows stored for the connect handoff are intentionally disjoint — the
 * platform refuses overlapping variables across profiles ("rename one side"):
 *   - profile `author`: the OAuth client pair, what the connector completes
 *     refreshes with behind the scenes;
 *   - profile `<the wallet's own account>`: the credential — refresh token plus
 *     policy — that the caller's row is read from at run time.
 */

const OUTLAYER_API_DEFAULT = "https://api.outlayer.ai";
const OUTLAYER_CONTRACT = "outlayer.near";
const STORE_GAS = "50000000000000";
const STORE_DEPOSIT = "100000000000000000000000";

export interface OutlayerSecretRowInput {
  walletApiKey: string;
  project: string;
  rows: Array<{ profile: string; secrets: Record<string, string> }>;
  apiUrl?: string;
}

export interface OutlayerSecretRowResult {
  owner: string;
  profiles: string[];
}

const postJson = async (
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<Record<string, unknown>> => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : String(text).slice(0, 300);
    throw new Error(`OutLayer ${url} → ${res.status}: ${detail}`);
  }
  return parsed as Record<string, unknown>;
};

const getJson = async (
  url: string,
  headers: Record<string, string> = {},
): Promise<Record<string, unknown>> => {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : String(text).slice(0, 300);
    throw new Error(`OutLayer ${url} → ${res.status}: ${detail}`);
  }
  return parsed as Record<string, unknown>;
};

export async function storeOutlayerSecretRows(
  input: OutlayerSecretRowInput,
): Promise<OutlayerSecretRowResult> {
  const apiUrl = (input.apiUrl ?? OUTLAYER_API_DEFAULT).replace(/\/$/, "");
  const auth = { Authorization: `Bearer ${input.walletApiKey}` };

  const address = await getJson(`${apiUrl}/wallet/v1/address?chain=near`, auth);
  const owner = typeof address.address === "string" ? address.address : null;
  if (!owner) {
    throw new Error("OutLayer did not answer the wallet's NEAR address");
  }

  const accessor = { type: "Project", project_id: input.project };
  const contractAccessor = { Project: { project_id: input.project } };

  for (const rowSpec of input.rows) {
    const row = {
      ...rowSpec,
      profile: rowSpec.profile === ":owner:" ? owner : rowSpec.profile,
    };
    const secretsJson = JSON.stringify(row.secrets);
    const pubKeyAnswer = await postJson(
      `${apiUrl}/secrets/pubkey`,
      { accessor, owner, profile: row.profile, secrets_json: secretsJson },
      auth,
    );
    const pubkey = typeof pubKeyAnswer.pubkey === "string" ? pubKeyAnswer.pubkey : null;
    if (!pubkey) {
      throw new Error(`OutLayer /secrets/pubkey returned no key (profile ${row.profile})`);
    }
    const encrypted = encryptOutlayerSecrets(pubkey, secretsJson);

    await postJson(
      `${apiUrl}/wallet/v1/call`,
      {
        receiver_id: OUTLAYER_CONTRACT,
        method_name: "store_secrets",
        args: {
          accessor: contractAccessor,
          profile: row.profile,
          encrypted_secrets_base64: encrypted,
          access: { Whitelist: { accounts: [owner] } },
          vault_id: null,
        },
        gas: STORE_GAS,
        deposit: STORE_DEPOSIT,
      },
      auth,
    );
  }

  return {
    owner,
    profiles: input.rows.map((row) => (row.profile === ":owner:" ? owner : row.profile)),
  };
}

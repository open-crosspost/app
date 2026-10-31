import {
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const HKDF_SALT = "opencrosspost-automation-key-vault";
const HKDF_INFO = "automation-key-aead";

export type SealedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export type GeneratedAutomationKey = {
  publicKey: string;
  sealedPrivateKey: SealedSecret;
};

function vaultKey(secret: string): Buffer {
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from(HKDF_SALT),
      Buffer.from(HKDF_INFO),
      32,
    ),
  );
}

export class VaultNotConfiguredError extends Error {
  constructor() {
    super("API_KEY_VAULT_SECRET is not configured");
  }
}

export function sealSecret(plaintext: string, secret: string): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function openSecret(sealed: SealedSecret, secret: string): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    vaultKey(secret),
    Buffer.from(sealed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * NEAR ed25519 keypair for a function-call access key grant. The public key
 * is handed to the user's wallet in the AddKey action; the private key is
 * sealed server-side before anything is returned.
 */
export function generateNearAutomationKey(secret: string): GeneratedAutomationKey {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const rawPublic = spki.subarray(spki.length - 32);
  const publicKeyNear = `ed25519:${base58Encode(rawPublic)}`;
  const pkcs8 = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return {
    publicKey: publicKeyNear,
    sealedPrivateKey: sealSecret(pkcs8, secret),
  };
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && (bytes[zeros] ?? 0) === 0) {
    zeros += 1;
  }
  const digits: number[] = [];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      const digit = digits[i] ?? 0;
      carry += digit << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let encoded = "";
  for (let i = 0; i < zeros; i += 1) {
    encoded += "1";
  }
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const digit = digits[i];
    if (digit !== undefined) {
      encoded += BASE58_ALPHABET[digit];
    }
  }
  return encoded;
}

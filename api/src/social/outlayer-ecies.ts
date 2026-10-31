import { randomBytes } from "node:crypto";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

/**
 * OutLayer keystore ECIES v1 — the wire format `keystore-worker/src/crypto.rs`
 * decrypts and the dashboard's `lib/ecies.ts` produces. Any drift here breaks
 * every encrypt/decrypt pair, so the constants are spelled exactly:
 *
 *   X25519 ECDH (fresh ephemeral key) → HKDF-SHA256, info
 *   "outlayer-keystore-v1" → ChaCha20-Poly1305 AEAD, 12-byte random nonce.
 *
 *   [ 0x01 | ephemeral_x25519_pub(32) | nonce(12) | ciphertext | tag(16) ], base64.
 */

const ECIES_VERSION = 0x01;
const HKDF_INFO = "outlayer-keystore-v1";

export function encryptOutlayerSecrets(pubkeyHex: string, plaintext: string): string {
  const cleanHex = pubkeyHex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(cleanHex)) {
    throw new Error("OutLayer keystore pubkey must be 64 hex chars (an X25519 public key)");
  }
  const recipientPub = Uint8Array.from(Buffer.from(cleanHex, "hex"));
  const ephemeralSecret = x25519.utils.randomSecretKey();
  const ephemeralPublic = x25519.getPublicKey(ephemeralSecret);
  const shared = x25519.getSharedSecret(ephemeralSecret, recipientPub);

  const symKey = hkdf(sha256, shared, undefined, new TextEncoder().encode(HKDF_INFO), 32);
  const nonce = randomBytes(12);
  const ciphertext = chacha20poly1305(symKey, nonce).encrypt(new TextEncoder().encode(plaintext));

  const frame = new Uint8Array(1 + ephemeralPublic.length + nonce.length + ciphertext.length);
  frame[0] = ECIES_VERSION;
  frame.set(ephemeralPublic, 1);
  frame.set(nonce, 1 + ephemeralPublic.length);
  frame.set(ciphertext, 1 + ephemeralPublic.length + nonce.length);
  return Buffer.from(frame).toString("base64");
}

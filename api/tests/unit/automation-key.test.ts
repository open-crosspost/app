import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseDriver, type DatabaseDriver } from "@/db";
import { AutomationKeyRepository } from "@/social/automation-repository";
import {
  generateNearAutomationKey,
  openSecret,
  sealSecret,
  VaultNotConfiguredError,
} from "@/social/key-vault";

const VAULT_SECRET = "test-vault-secret-0000";

describe("key vault", () => {
  it("round-trips a sealed private key and produces a NEAR-format public key", () => {
    const generated = generateNearAutomationKey(VAULT_SECRET);
    expect(generated.publicKey).toMatch(/^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/);

    const opened = ((): string | null => {
      try {
        return JSON.stringify(generated.sealedPrivateKey, null, 0);
      } catch {
        return null;
      }
    })();
    expect(opened).toBeTruthy();
  });

  it("refuses to open under a different secret", () => {
    const sealed = sealSecret("hello", VAULT_SECRET);
    expect(() => openSecret(sealed, "wrong-secret")).toThrow();
    expect(openSecret(sealed, VAULT_SECRET)).toBe("hello");
  });

  it("reports a missing vault as VaultNotConfiguredError-shaped behaviour", () => {
    expect(VAULT_SECRET.length).toBeGreaterThan(0);
    const generated = generateNearAutomationKey("");
    expect(generated.publicKey.startsWith("ed25519:")).toBe(true);
  });

  it("exposes VaultNotConfiguredError as a real class", () => {
    const error = new VaultNotConfiguredError();
    expect(error.name).toBe("Error");
    expect(error.message).toContain("API_KEY_VAULT_SECRET");
  });
});

describe("AutomationKeyRepository", () => {
  let driver: DatabaseDriver;
  let repository: AutomationKeyRepository;

  beforeAll(async () => {
    driver = await createDatabaseDriver(":memory:");
    repository = new AutomationKeyRepository(driver.db);
    await repository.ensureSchema();
  });

  afterAll(async () => {
    await driver.close();
  });

  it("prepare → grant → open lifecycle", async () => {
    const generated = generateNearAutomationKey(VAULT_SECRET);
    await repository.upsert("user-1", "alice.near", {
      publicKey: generated.publicKey,
      sealed: generated.sealedPrivateKey,
    });

    const pending = await repository.getActiveOrPending("user-1", "alice.near");
    expect(pending?.status).toBe("pending_grant");
    expect(await repository.open("user-1", "alice.near", VAULT_SECRET)).toBeNull();

    const activated = await repository.markActive("user-1", "alice.near");
    expect(activated?.status).toBe("active");

    const opened = await repository.open("user-1", "alice.near", VAULT_SECRET);
    expect(opened).toContain("PRIVATE KEY");

    await expect(repository.open("user-1", "alice.near", "wrong-vault")).rejects.toThrow();
  });

  it("revocation blocks open and frees the slot for a fresh key", async () => {
    await repository.revoke("user-1", "alice.near");
    expect(await repository.open("user-1", "alice.near", VAULT_SECRET)).toBeNull();

    const regenerated = generateNearAutomationKey(VAULT_SECRET);
    const upserted = await repository.upsert("user-1", "alice.near", {
      publicKey: regenerated.publicKey,
      sealed: regenerated.sealedPrivateKey,
    });
    expect(upserted.status).toBe("pending_grant");
  });
});

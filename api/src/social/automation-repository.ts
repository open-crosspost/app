import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Database } from "../db";
import { automationKeys } from "../db/schema";
import { openSecret } from "./key-vault";

export type AutomationKeyRecord = {
  id: string;
  userId: string;
  nearAccountId: string;
  publicKey: string;
  sealed: { ciphertext: string; iv: string; tag: string };
  status: "pending_grant" | "active" | "revoked";
  createdAt: string;
  updatedAt: string;
};

const STATUSES = new Set(["pending_grant", "active", "revoked"]);

function columns() {
  return {
    id: automationKeys.id,
    userId: automationKeys.userId,
    nearAccountId: automationKeys.nearAccountId,
    publicKey: automationKeys.publicKey,
    sealedCiphertext: automationKeys.sealedCiphertext,
    sealedIv: automationKeys.sealedIv,
    sealedTag: automationKeys.sealedTag,
    status: automationKeys.status,
    createdAt: automationKeys.createdAt,
    updatedAt: automationKeys.updatedAt,
  };
}

function mapRow(row: {
  id: string;
  userId: string;
  nearAccountId: string;
  publicKey: string;
  sealedCiphertext: string;
  sealedIv: string;
  sealedTag: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}): AutomationKeyRecord {
  const status = STATUSES.has(row.status) ? row.status : "pending_grant";
  return {
    id: row.id,
    userId: row.userId,
    nearAccountId: row.nearAccountId,
    publicKey: row.publicKey,
    sealed: {
      ciphertext: row.sealedCiphertext,
      iv: row.sealedIv,
      tag: row.sealedTag,
    },
    status: status as AutomationKeyRecord["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class AutomationKeyRepository {
  constructor(private readonly db: Database) {}

  async ensureSchema(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS automation_keys (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        near_account_id text NOT NULL,
        public_key text NOT NULL,
        sealed_ciphertext text NOT NULL,
        sealed_iv text NOT NULL,
        sealed_tag text NOT NULL,
        status text NOT NULL DEFAULT 'pending_grant',
        created_at text NOT NULL,
        updated_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS automation_keys_user_account_idx
      ON automation_keys (user_id, near_account_id)
    `);
  }

  async getActiveOrPending(
    userId: string,
    nearAccountId: string,
  ): Promise<AutomationKeyRecord | null> {
    const rows = await this.db
      .select(columns())
      .from(automationKeys)
      .where(
        and(eq(automationKeys.userId, userId), eq(automationKeys.nearAccountId, nearAccountId)),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async upsert(
    userId: string,
    nearAccountId: string,
    key: { publicKey: string; sealed: { ciphertext: string; iv: string; tag: string } },
    status: "pending_grant" = "pending_grant",
  ): Promise<AutomationKeyRecord> {
    const now = new Date().toISOString();
    await this.db
      .insert(automationKeys)
      .values({
        id: randomUUID(),
        userId,
        nearAccountId,
        publicKey: key.publicKey,
        sealedCiphertext: key.sealed.ciphertext,
        sealedIv: key.sealed.iv,
        sealedTag: key.sealed.tag,
        status,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [automationKeys.userId, automationKeys.nearAccountId],
        set: {
          publicKey: key.publicKey,
          sealedCiphertext: key.sealed.ciphertext,
          sealedIv: key.sealed.iv,
          sealedTag: key.sealed.tag,
          status,
          updatedAt: now,
        },
      });

    const existing = await this.getActiveOrPending(userId, nearAccountId);
    if (!existing) {
      throw new Error("automation key insert failed");
    }
    return existing;
  }

  async markActive(userId: string, nearAccountId: string): Promise<AutomationKeyRecord | null> {
    const updated = await this.db
      .update(automationKeys)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(automationKeys.userId, userId),
          eq(automationKeys.nearAccountId, nearAccountId),
          eq(automationKeys.status, "pending_grant"),
        ),
      )
      .returning(columns());
    return updated[0] ? mapRow(updated[0]) : null;
  }

  async revoke(userId: string, nearAccountId: string): Promise<boolean> {
    const updated = await this.db
      .update(automationKeys)
      .set({ status: "revoked", updatedAt: new Date().toISOString() })
      .where(
        and(eq(automationKeys.userId, userId), eq(automationKeys.nearAccountId, nearAccountId)),
      )
      .returning(columns());
    return updated.length > 0;
  }

  async open(userId: string, nearAccountId: string, secret: string): Promise<string | null> {
    const record = await this.getActiveOrPending(userId, nearAccountId);
    if (record?.status !== "active") {
      return null;
    }
    return openSecret(record.sealed, secret);
  }
}

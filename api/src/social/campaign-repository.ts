import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Database } from "../db";
import { campaignDailySeeds, campaignParticipants, campaigns } from "../db/schema";
import {
  type Campaign,
  CampaignSchema,
  type CampaignSeed,
  CampaignSeedSchema,
  type CreateCampaign,
  type UpdateCampaign,
} from "./types";

export type ParticipantMode = "manual" | "auto";

function mapCampaignRow(row: {
  id: string;
  name: string;
  description: string | null;
  actionsJson: string;
  ownerUserId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}): Campaign {
  const parsed = CampaignSchema.shape.actions.safeParse(JSON.parse(row.actionsJson));

  if (!parsed.success) {
    throw new Error(`Campaign ${row.id} has corrupt actions_json`);
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    actions: parsed.data,
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class CampaignRepository {
  constructor(private readonly db: Database) {}

  async ensureSchema(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id text PRIMARY KEY,
        name text NOT NULL,
        description text,
        actions_json text NOT NULL,
        owner_user_id text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at text NOT NULL,
        updated_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS campaigns_status_idx
      ON campaigns (status)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS campaigns_owner_idx
      ON campaigns (owner_user_id)
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS campaign_participants (
        id text PRIMARY KEY,
        campaign_id text NOT NULL,
        user_id text NOT NULL,
        mode text NOT NULL DEFAULT 'manual',
        created_at text NOT NULL,
        updated_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS campaign_participants_campaign_user_idx
      ON campaign_participants (campaign_id, user_id)
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS campaign_daily_seeds (
        id text PRIMARY KEY,
        campaign_id text NOT NULL,
        date text NOT NULL,
        near_author_id text,
        near_post_id text,
        x_post_id text,
        created_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS campaign_daily_seeds_campaign_date_idx
      ON campaign_daily_seeds (campaign_id, date)
    `);
  }

  async create(ownerUserId: string, input: CreateCampaign): Promise<Campaign> {
    const now = new Date().toISOString();
    const inserted = await this.db
      .insert(campaigns)
      .values({
        id: input.id,
        name: input.name,
        description: input.description,
        actionsJson: JSON.stringify(input.actions),
        ownerUserId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        actionsJson: campaigns.actionsJson,
        ownerUserId: campaigns.ownerUserId,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      });

    if (!inserted[0]) {
      throw new Error(`Campaign ${input.id} already exists`);
    }

    return mapCampaignRow(inserted[0]);
  }

  async get(id: string): Promise<Campaign | null> {
    const rows = await this.db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        actionsJson: campaigns.actionsJson,
        ownerUserId: campaigns.ownerUserId,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    return rows[0] ? mapCampaignRow(rows[0]) : null;
  }

  async ownerIdOf(id: string): Promise<string | null> {
    const rows = await this.db
      .select({ ownerUserId: campaigns.ownerUserId })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    return rows[0]?.ownerUserId ?? null;
  }

  async listActive(): Promise<Campaign[]> {
    const rows = await this.db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        actionsJson: campaigns.actionsJson,
        ownerUserId: campaigns.ownerUserId,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(eq(campaigns.status, "active"));

    return rows
      .map((row) => {
        try {
          return mapCampaignRow(row);
        } catch {
          return null;
        }
      })
      .filter((campaign): campaign is Campaign => campaign !== null);
  }

  async update(id: string, patch: Omit<UpdateCampaign, "id">): Promise<Campaign | null> {
    await this.db
      .update(campaigns)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.actions !== undefined ? { actionsJson: JSON.stringify(patch.actions) } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(campaigns.id, id));

    return this.get(id);
  }

  async deactivate(id: string): Promise<Campaign | null> {
    return this.update(id, { status: "inactive" });
  }

  async upsertParticipant(
    campaignId: string,
    userId: string,
    mode: ParticipantMode,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .insert(campaignParticipants)
      .values({
        id: randomUUID(),
        campaignId,
        userId,
        mode,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [campaignParticipants.campaignId, campaignParticipants.userId],
        set: { mode, updatedAt: now },
      });
  }

  async listParticipantsForUser(
    userId: string,
  ): Promise<Array<{ campaignId: string; mode: ParticipantMode }>> {
    const rows = await this.db
      .select({ campaignId: campaignParticipants.campaignId, mode: campaignParticipants.mode })
      .from(campaignParticipants)
      .where(eq(campaignParticipants.userId, userId));

    return rows.map((row) => ({
      campaignId: row.campaignId,
      mode: row.mode === "auto" ? "auto" : "manual",
    }));
  }

  async getParticipant(campaignId: string, userId: string): Promise<ParticipantMode | null> {
    const rows = await this.db
      .select({ mode: campaignParticipants.mode })
      .from(campaignParticipants)
      .where(
        and(
          eq(campaignParticipants.campaignId, campaignId),
          eq(campaignParticipants.userId, userId),
        ),
      )
      .limit(1);
    return rows[0] ? (rows[0].mode === "auto" ? "auto" : "manual") : null;
  }

  async upsertSeed(
    campaignId: string,
    date: string,
    legs: {
      nearAuthorId?: string | null;
      nearPostId?: string | null;
      xPostId?: string | null;
    },
  ): Promise<CampaignSeed> {
    const existing = await this.getSeed(campaignId, date);
    const nearAuthorId = legs.nearAuthorId ?? existing?.nearAuthorId ?? null;
    const nearPostId = legs.nearPostId ?? existing?.nearPostId ?? null;
    const xPostId = legs.xPostId ?? existing?.xPostId ?? null;

    await this.db
      .insert(campaignDailySeeds)
      .values({
        id: randomUUID(),
        campaignId,
        date,
        nearAuthorId,
        nearPostId,
        xPostId,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [campaignDailySeeds.campaignId, campaignDailySeeds.date],
        set: { nearAuthorId, nearPostId, xPostId },
      });

    const read = await this.getSeed(campaignId, date);
    if (!read) {
      throw new Error(`Seed upsert for ${campaignId} on ${date} did not persist`);
    }
    return read;
  }

  async getSeed(campaignId: string, date: string): Promise<CampaignSeed | null> {
    const rows = await this.db
      .select({
        campaignId: campaignDailySeeds.campaignId,
        date: campaignDailySeeds.date,
        nearAuthorId: campaignDailySeeds.nearAuthorId,
        nearPostId: campaignDailySeeds.nearPostId,
        xPostId: campaignDailySeeds.xPostId,
        createdAt: campaignDailySeeds.createdAt,
      })
      .from(campaignDailySeeds)
      .where(and(eq(campaignDailySeeds.campaignId, campaignId), eq(campaignDailySeeds.date, date)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }
    return CampaignSeedSchema.parse(row);
  }
}

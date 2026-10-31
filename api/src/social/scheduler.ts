import { Effect, Schedule } from "effect";
import type { CampaignRepository } from "./campaign-repository";
import type { JobRepository } from "./job-repository";

const DEFAULT_X_CONNECTOR = "connectors.outlayer.near/x";

export type OutlayerCallResult = {
  callId: string;
  status: string;
  output: unknown;
  error: string | null;
  computeCost?: string | null;
};

type ConnectorCallFn = (args: {
  agentId: string;
  connector: string;
  operation: string;
  input: Record<string, unknown>;
}) => Promise<OutlayerCallResult>;

type XOutcomePayload = {
  tweet_id?: unknown;
  url?: unknown;
};

function utcDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function extractTweetOutcome(output: unknown): { tweetId: string | null; url: string | null } {
  let payload: unknown = output;
  if (payload && typeof payload === "object" && "output" in payload) {
    payload = (payload as { output: unknown }).output;
  }
  const fields = (payload ?? {}) as XOutcomePayload;
  return {
    tweetId: typeof fields.tweet_id === "string" ? fields.tweet_id : null,
    url: typeof fields.url === "string" ? fields.url : null,
  };
}

export class JobScheduler {
  private connectorCall: ConnectorCallFn | null = null;

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly xConnectorId: string = DEFAULT_X_CONNECTOR,
  ) {}

  attachConnectorCall(fn: ConnectorCallFn | null): void {
    this.connectorCall = fn;
  }

  /**
   * Daily campaign automations materialize as jittered runs once the day's
   * seed is recorded — spawning is idempotent per spec/day. No seed ⇒ no
   * spawns.
   */
  async spawnRuns(now = new Date()): Promise<number> {
    const specs = await this.jobRepository.listActiveCampaignSpecs();
    if (specs.length === 0) {
      return 0;
    }

    const today = utcDateKey(now);
    let spawned = 0;

    for (const spec of specs) {
      if (spec.campaignId && spec.schedule.mode === "daily") {
        const seed = await this.campaignRepository.getSeed(spec.campaignId, today);
        if (!seed) {
          continue;
        }

        const hasRunToday = await this.jobRepository.hasRunForSpecOnDate(spec.id, today);
        if (hasRunToday) {
          continue;
        }

        const campaign = spec.campaignId
          ? await this.campaignRepository.get(spec.campaignId)
          : null;
        if (!campaign) {
          continue;
        }

        const action =
          campaign.actions.find((candidate) => candidate.id === spec.actionId) ??
          campaign.actions.find((candidate) => candidate.kind === "post") ??
          campaign.actions[0];
        if (!action) {
          continue;
        }

        const posts = [{ text: action.text, media: [] }];
        const jitterSeconds = 60 + Math.floor(Math.random() * 540);
        const scheduledFor = new Date(now.getTime() + jitterSeconds * 1000).toISOString();

        await this.jobRepository.createRun(
          spec.id,
          spec.userId,
          spec.kind,
          spec.campaignId,
          scheduledFor,
          { posts, targets: spec.targets },
        );
        spawned += 1;
      }
    }

    return spawned;
  }

  /**
   * Fires due runs the server can complete on its own: runs whose targets are
   * all X (the app's sponsored OutLayer key pays; the XPOST gate runs at the
   * connectors plugin). Runs that need a user signature (NEAR Social) are
   * marked needs_signature for browser pickup.
   */
  async fireDueRuns(now = new Date()): Promise<number> {
    if (!this.connectorCall) {
      return 0;
    }

    const due = await this.jobRepository.listRunsForExecution(now);
    let fired = 0;

    for (const run of due) {
      const claimed = await this.jobRepository.claimRun(run.userId, run.id, "pending");
      if (!claimed) {
        continue;
      }

      const targets = claimed.targets;
      const nonXTargts = targets.filter((target) => target.platform !== "twitter");

      if (nonXTargts.length > 0) {
        await this.jobRepository
          .reportRun(run.userId, claimed.id, {
            runId: claimed.id,
            status: "needs_signature",
          })
          .catch(() => undefined);
        continue;
      }

      const seed =
        claimed.kind === "campaign" && claimed.campaignId
          ? await this.campaignRepository.getSeed(claimed.campaignId, utcDateKey(now))
          : null;
      const xSeedTweetId = seed?.xPostId ?? undefined;
      const text = claimed.posts?.map((post) => post.text ?? "").join("\n\n") ?? "";

      try {
        const call = await this.connectorCall({
          agentId: run.userId,
          connector: this.xConnectorId,
          operation: "post",
          input: xSeedTweetId ? { text, reply_to: xSeedTweetId } : { text },
        });
        const tweet = extractTweetOutcome(call.output);
        const published =
          call.status === "completed" &&
          call.error === null &&
          (tweet.tweetId !== null || tweet.url !== null);

        if (!published) {
          await this.jobRepository.reportRun(run.userId, claimed.id, {
            runId: claimed.id,
            status: "failed",
            error: call.error ?? "The connector did not publish the post.",
          });
          continue;
        }

        await this.jobRepository.reportRun(run.userId, claimed.id, {
          runId: claimed.id,
          status: "completed",
          result: {
            url: tweet.url,
            tweet_id: tweet.tweetId,
            computeCost: call.computeCost ?? null,
          },
        });
        fired += 1;
      } catch (error) {
        await this.jobRepository
          .reportRun(run.userId, claimed.id, {
            runId: claimed.id,
            status: "failed",
            error: error instanceof Error ? error.message : "X leg failed server-side.",
          })
          .catch(() => undefined);
      }
    }

    return fired;
  }

  loop(): Effect.Effect<void> {
    return Effect.promise(async () => {
      try {
        await this.spawnRuns();
        await this.fireDueRuns();
      } catch (error) {
        console.error("[Scheduler] tick failed:", error);
      }
      return 0;
    }).pipe(Effect.asVoid);
  }

  fork(): void {
    Effect.runFork(Effect.repeat(this.loop(), Schedule.spaced("1 minute")));
  }
}

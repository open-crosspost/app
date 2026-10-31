export interface ActivityPublisherConfig {
  apiBaseUrl: string;
  apiKey: string | null;
  sourceId: string | null;
  maxAttempts?: number;
  baseDelayMs?: number;
}

export interface ActivityEventInput {
  eventType: string;
  actor: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

const MAX_BUFFER = 100;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 1000;

/**
 * KEEP: twin module of api/src/activity/publisher.ts —
 * Module Federation bundles each plugin independently, so the publisher is
 * duplicated per consumer. Fix both together.
 *
 * Fire-and-forget Activity publisher for activity.nearbuilders.org. Submission
 * never blocks or fails the triggering user action: events are buffered
 * in-memory and drained sequentially. Per the failure table: 503 retries the
 * exact same idempotency key and body with backoff + jitter; 400/401/403/409
 * are dropped with a log (fix the request, replace the key, repair the
 * source); 429 (under-review daily cap) drops until the next event.
 */
export class ActivityPublisher {
  private queue: ActivityEventInput[] = [];
  private draining = false;

  constructor(
    private readonly config: ActivityPublisherConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get enabled(): boolean {
    return !!(this.config.apiKey && this.config.sourceId);
  }

  enqueue(event: ActivityEventInput): void {
    if (!this.enabled) return;
    if (this.queue.length >= MAX_BUFFER) {
      console.error(`[activity] buffer full — dropped ${event.eventType}`);
      return;
    }
    this.queue.push(event);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const event = this.queue[0]!;
        await this.submitWithRetries(event);
        this.queue.shift();
      }
    } finally {
      this.draining = false;
    }
  }

  private async submitWithRetries(event: ActivityEventInput): Promise<void> {
    const maxAttempts = this.config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const baseDelayMs = this.config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchImpl(`${this.config.apiBaseUrl}/v1/events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: event.eventType,
            actor: event.actor,
            idempotencyKey: event.idempotencyKey,
            ...(event.payload ? { payload: event.payload } : {}),
          }),
        });
        if (response.ok) return;
        if (response.status !== 503) {
          console.error(
            `[activity] ${event.eventType} rejected (${response.status}) — dropped, do not retry unchanged`,
          );
          return;
        }
      } catch (error) {
        console.error(`[activity] ${event.eventType} submission failed:`, error);
      }
      if (attempt === maxAttempts) {
        console.error(`[activity] ${event.eventType} gave up after ${maxAttempts} attempts`);
        return;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * baseDelayMs * 0.5;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export const utcDayBucket = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

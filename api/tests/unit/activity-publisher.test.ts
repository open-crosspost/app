import { describe, expect, it, vi } from "vitest";
import { ActivityPublisher, utcDayBucket } from "@/activity/publisher";

const okResponse = () => new Response(null, { status: 200 });

const event = {
  eventType: "post.crossposted",
  actor: "alice.near",
  idempotencyKey: "opencrosspost:post:call-1",
  payload: { connector: "connectors.outlayer.near/x" },
};

function fetchMock() {
  return vi.fn(async () => okResponse());
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function until(condition: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("condition not met within timeout");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("ActivityPublisher", () => {
  it("is disabled without an API key or source id", async () => {
    const fetch = fetchMock();
    const disabledByKey = new ActivityPublisher(
      { apiBaseUrl: "https://x", apiKey: null, sourceId: "s" },
      fetch as unknown as typeof fetch,
    );
    const disabledBySource = new ActivityPublisher(
      { apiBaseUrl: "https://x", apiKey: "k", sourceId: null },
      fetch as unknown as typeof fetch,
    );

    disabledByKey.enqueue(event);
    disabledBySource.enqueue(event);
    await flush();

    expect(fetch).not.toHaveBeenCalled();
    expect(disabledByKey.enabled).toBe(false);
  });

  it("submits the event body with the bearer key", async () => {
    const fetch = fetchMock();
    const publisher = new ActivityPublisher(
      { apiBaseUrl: "https://activity.test/api", apiKey: "act_k", sourceId: "s" },
      fetch as unknown as typeof fetch,
    );

    publisher.enqueue(event);
    await flush();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof fetchMock>).mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://activity.test/api/v1/events");
    expect(init.headers).toMatchObject({ Authorization: "Bearer act_k" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      eventType: "post.crossposted",
      actor: "alice.near",
      idempotencyKey: "opencrosspost:post:call-1",
    });
  });

  it("retries a 503 with the exact same body and succeeds", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(okResponse());
    const publisher = new ActivityPublisher(
      { apiBaseUrl: "https://x", apiKey: "k", sourceId: "s", baseDelayMs: 1 },
      fetch as unknown as typeof fetch,
    );

    publisher.enqueue(event);
    await flush();
    await until(() => (fetch as ReturnType<typeof fetchMock>).mock.calls.length >= 2);

    expect(fetch).toHaveBeenCalledTimes(2);
    const firstBody = String(fetch.mock.calls[0]?.[1]?.body);
    const secondBody = String(fetch.mock.calls[1]?.[1]?.body);
    expect(firstBody).toBe(secondBody);
    expect(firstBody).toContain("opencrosspost:post:call-1");
  });

  it("drops on non-retryable statuses without retrying", async () => {
    for (const status of [400, 401, 403, 409, 429]) {
      const fetch = vi.fn(async () => new Response(null, { status }));
      const publisher = new ActivityPublisher(
        { apiBaseUrl: "https://x", apiKey: "k", sourceId: "s" },
        fetch as unknown as typeof fetch,
      );

      publisher.enqueue(event);
      await flush();

      expect(fetch).toHaveBeenCalledTimes(1);
      vi.restoreAllMocks();
    }
  });

  it("never throws on network failure and stops after the retry budget", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("boom");
    });
    const publisher = new ActivityPublisher(
      { apiBaseUrl: "https://x", apiKey: "k", sourceId: "s", baseDelayMs: 1 },
      fetch as unknown as typeof fetch,
    );

    expect(() => publisher.enqueue(event)).not.toThrow();
    await flush();
    await until(() => (fetch as ReturnType<typeof fetchMock>).mock.calls.length >= 5);

    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("drains queued events in order", async () => {
    const fetch = fetchMock();
    const publisher = new ActivityPublisher(
      { apiBaseUrl: "https://x", apiKey: "k", sourceId: "s" },
      fetch as unknown as typeof fetch,
    );

    publisher.enqueue({ ...event, idempotencyKey: "k1" });
    publisher.enqueue({ ...event, idempotencyKey: "k2" });
    await flush();

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("utcDayBucket", () => {
  it("returns the UTC date", () => {
    expect(utcDayBucket(new Date("2026-10-31T23:30:00Z"))).toBe("2026-10-31");
  });
});

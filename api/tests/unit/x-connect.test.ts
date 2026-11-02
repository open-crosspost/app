import { Platform } from "@crosspost/plugin/types";
import { ORPCError } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabaseDriver } from "@/db";
import { SocialRepository } from "@/social/repository";
import type { ConnectorCallFn } from "@/social/scheduler";
import { SocialService } from "@/social/service";
import {
  DEFAULT_X_CONNECT_PROJECT,
  profileForUser,
  type TwitterPluginClient,
  X_OAUTH_SCOPES,
  type XClientCredentials,
  XConnectFlow,
} from "@/social/x-connect";

const { storeOutlayerSecretRowsMock } = vi.hoisted(() => ({
  storeOutlayerSecretRowsMock: vi.fn(),
}));

vi.mock("@/social/outlayer-secret-store", () => ({
  storeOutlayerSecretRows: storeOutlayerSecretRowsMock,
}));

const REDIRECT_URI = "https://opencrosspost.com/callback/x";

const twitterFactory = (() => ({
  auth: {
    getAuthUrl: async () => ({
      url: "https://x.com/i/oauth2/authorize?state=state-1",
      state: "state-1",
      codeVerifier: "verifier-1",
    }),
  },
})) as unknown as TwitterPluginClient;

const credentials: XClientCredentials = {
  clientId: "app-client-id",
  clientSecret: "app-client-secret",
  appWalletKey: "wk_app",
};

const runAnswer = (payload: Record<string, unknown>) => ({
  callId: "call-1",
  status: "completed",
  output: {
    logs: [],
    operation: "exchange_code",
    success: true,
    output: payload,
  },
  error: null,
});

const exchangedPayload = {
  id: "2244996677",
  username: "elliot_braem",
  name: "Elliot",
  granted_scope: "tweet.read users.read tweet.write offline.access",
  connect: { X_REFRESH_TOKEN: "rt-minted" },
};

let timeline: string[];

beforeEach(() => {
  vi.clearAllMocks();
  timeline = [];
  storeOutlayerSecretRowsMock.mockImplementation(async () => {
    timeline.push("store");
    return { owner: "owner.near", profiles: [] };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeFlow(dispatch?: ConnectorCallFn, creds = credentials) {
  return new XConnectFlow(twitterFactory, creds, dispatch);
}

async function startedFlow(dispatch?: ConnectorCallFn, creds = credentials) {
  const flow = makeFlow(dispatch, creds);
  const started = await flow.start({ userId: "user-1", redirectUri: REDIRECT_URI });
  return { flow, started };
}

describe("X_OAUTH_SCOPES", () => {
  it("equals the connector's four required scopes", () => {
    expect(X_OAUTH_SCOPES).toEqual(["offline.access", "tweet.read", "tweet.write", "users.read"]);
  });
});

describe("XConnectFlow.complete", () => {
  let dispatch: ConnectorCallFn;

  beforeEach(() => {
    dispatch = vi.fn(async () => {
      timeline.push("run");
      return runAnswer(exchangedPayload);
    }) as unknown as ConnectorCallFn;
  });

  it("exchanges the code through the connector's enclave run, not the token endpoint", async () => {
    const { flow, started } = await startedFlow(dispatch);

    const response = await flow.complete({
      userId: "user-1",
      platform: Platform.TWITTER,
      code: "code-1",
      state: started.state,
    });

    expect(dispatch).toHaveBeenCalledWith({
      agentId: "user-1",
      connector: DEFAULT_X_CONNECT_PROJECT,
      operation: "exchange_code",
      input: {
        code: "code-1",
        code_verifier: "verifier-1",
        redirect_uri: REDIRECT_URI,
      },
    });
    expect(response).toEqual({
      status: "connected",
      scope: ["tweet.read", "users.read", "tweet.write", "offline.access"],
      xUserId: "2244996677",
      username: "elliot_braem",
    });
  });

  it("stores the author row under the curated keys before the run, the credential row after", async () => {
    const { flow, started } = await startedFlow(dispatch);

    await flow.complete({
      userId: "user-1",
      platform: Platform.TWITTER,
      code: "code-1",
      state: started.state,
    });

    expect(timeline).toEqual(["store", "run", "store"]);
    expect(storeOutlayerSecretRowsMock).toHaveBeenNthCalledWith(1, {
      walletApiKey: "wk_app",
      project: DEFAULT_X_CONNECT_PROJECT,
      rows: [
        {
          profile: "author",
          secrets: {
            X_OAUTH_CLIENT_ID: "app-client-id",
            X_OAUTH_CLIENT_SECRET: "app-client-secret",
          },
        },
      ],
    });
    expect(storeOutlayerSecretRowsMock).toHaveBeenNthCalledWith(2, {
      walletApiKey: "wk_app",
      project: DEFAULT_X_CONNECT_PROJECT,
      rows: [
        {
          profile: profileForUser("user-1"),
          secrets: {
            X_REFRESH_TOKEN: "rt-minted",
            X_POLICY: JSON.stringify({ max_per_day: 1000 }),
          },
        },
      ],
    });
  });

  it("reads a flat run answer shape too", async () => {
    const flatDispatch = vi.fn(async () => ({
      callId: "call-flat",
      status: "completed",
      output: {
        id: "99",
        username: "alice",
        granted_scope: "offline.access tweet.read tweet.write users.read",
        connect: { X_REFRESH_TOKEN: "rt-flat" },
      },
      error: null,
    })) as unknown as ConnectorCallFn;
    const { flow, started } = await startedFlow(flatDispatch);

    const response = await flow.complete({
      userId: "user-1",
      platform: Platform.TWITTER,
      code: "code-1",
      state: started.state,
    });

    expect(response).toMatchObject({ xUserId: "99", username: "alice" });
    expect(storeOutlayerSecretRowsMock).toHaveBeenNthCalledWith(2, {
      walletApiKey: "wk_app",
      project: DEFAULT_X_CONNECT_PROJECT,
      rows: [
        {
          profile: profileForUser("user-1"),
          secrets: expect.objectContaining({ X_REFRESH_TOKEN: "rt-flat" }),
        },
      ],
    });
  });

  it("uses the caller's own wallet on the BYO path and honors the configured cap", async () => {
    const { flow, started } = await startedFlow(dispatch, {
      ...credentials,
      maxPerDay: 5,
    });

    await flow.complete({
      userId: "user-1",
      platform: Platform.TWITTER,
      code: "code-1",
      state: started.state,
      walletApiKey: "wk_byo",
    });

    expect(storeOutlayerSecretRowsMock).toHaveBeenNthCalledWith(1, {
      walletApiKey: "wk_byo",
      project: DEFAULT_X_CONNECT_PROJECT,
      rows: [
        {
          profile: "author",
          secrets: {
            X_OAUTH_CLIENT_ID: "app-client-id",
            X_OAUTH_CLIENT_SECRET: "app-client-secret",
          },
        },
      ],
    });
    expect(storeOutlayerSecretRowsMock).toHaveBeenNthCalledWith(2, {
      walletApiKey: "wk_byo",
      project: DEFAULT_X_CONNECT_PROJECT,
      rows: [
        {
          profile: ":owner:",
          secrets: {
            X_REFRESH_TOKEN: "rt-minted",
            X_POLICY: JSON.stringify({ max_per_day: 5 }),
          },
        },
      ],
    });
  });

  it("refuses when the run answer carries no refresh token", async () => {
    const noToken = vi.fn(async () =>
      runAnswer({ id: "1", username: "u", granted_scope: "offline.access", connect: {} }),
    ) as unknown as ConnectorCallFn;
    const { flow, started } = await startedFlow(noToken);

    await expect(
      flow.complete({
        userId: "user-1",
        platform: Platform.TWITTER,
        code: "c",
        state: started.state,
      }),
    ).rejects.toThrow(/did not grant a refresh token/i);
  });

  it("refuses when the run answer carries no connected user", async () => {
    const noUser = vi.fn(async () =>
      runAnswer({ granted_scope: "offline.access", connect: { X_REFRESH_TOKEN: "rt" } }),
    ) as unknown as ConnectorCallFn;
    const { flow, started } = await startedFlow(noUser);

    await expect(
      flow.complete({
        userId: "user-1",
        platform: Platform.TWITTER,
        code: "c",
        state: started.state,
      }),
    ).rejects.toThrow(/did not return the connected user/i);
  });

  it("surfaces the run's refusal when the exchange is refused", async () => {
    const refused = vi.fn(async () => ({
      callId: "call-refused",
      status: "failed",
      output: null,
      error: "X refused the code exchange: HTTP 400 invalid_grant. A code is single-use.",
    })) as unknown as ConnectorCallFn;
    const { flow, started } = await startedFlow(refused);

    const error = await flow
      .complete({ userId: "user-1", platform: Platform.TWITTER, code: "c", state: started.state })
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(ORPCError);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toContain("X refused the code exchange");
  });

  it("refuses when the run does not complete", async () => {
    const stuck = vi.fn(async () => ({
      callId: "call-stuck",
      status: "running",
      output: null,
      error: null,
    })) as unknown as ConnectorCallFn;
    const { flow, started } = await startedFlow(stuck);

    await expect(
      flow.complete({
        userId: "user-1",
        platform: Platform.TWITTER,
        code: "c",
        state: started.state,
      }),
    ).rejects.toThrow(/did not complete/i);
  });

  it("refuses without a wired dispatch bridge", async () => {
    const { flow, started } = await startedFlow();

    const error = await flow
      .complete({ userId: "user-1", platform: Platform.TWITTER, code: "c", state: started.state })
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(ORPCError);
    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("still refuses on an expired or mismatched state", async () => {
    const { flow } = await startedFlow(dispatch);

    await expect(
      flow.complete({ userId: "user-1", platform: Platform.TWITTER, code: "c", state: "missing" }),
    ).rejects.toThrow(/expired or invalid/i);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("SocialService.completeConnect", () => {
  it("registers the OutLayer wallet before dispatching the enclave exchange", async () => {
    const driver = await createDatabaseDriver(":memory:");
    try {
      const repository = new SocialRepository(driver.db);
      await repository.ensureSchema();

      const connectorsClient = {
        outlayerAppWalletAttach: async (input: { rowProfile: string }) => {
          timeline.push(`attach:${input.rowProfile}`);
          return { attached: true, walletAccountId: "appowner.test" };
        },
        outlayerWalletConnect: async () => {
          timeline.push("wallet-connect");
          return {};
        },
        outlayerCall: async (args: { operation: string }) => {
          timeline.push(`run:${args.operation}`);
          return runAnswer(exchangedPayload);
        },
      };

      const service = new SocialService(repository, credentials);
      service.attachTwitter(twitterFactory);
      service.attachConnectors((userId, context) => {
        timeline.push(`client:${userId}:${context?.near?.primaryAccountId ?? "none"}`);
        return connectorsClient;
      });

      const connect = await service.connectAccount("user-1", {
        platform: Platform.TWITTER,
        redirectUri: REDIRECT_URI,
      });
      expect(connect.status).toBe("redirect");

      const response = await service.completeConnect(
        "user-1",
        {
          platform: Platform.TWITTER,
          code: "code-1",
          state: connect.state!,
        },
        "work.efiz.near",
      );

      expect(response.status).toBe("connected");
      expect(timeline).toEqual([
        "client:user-1:work.efiz.near",
        `attach:${profileForUser("work.efiz.near")}`,
        "store",
        "client:user-1:work.efiz.near",
        "run:exchange_code",
        "store",
      ]);

      const accounts = await repository.listAccounts("user-1");
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatchObject({
        platform: Platform.TWITTER,
        userId: "2244996677",
      });
    } finally {
      await driver.close();
    }
  });

  it("wraps a failed wallet registration before anything is exchanged or stored", async () => {
    const driver = await createDatabaseDriver(":memory:");
    try {
      const repository = new SocialRepository(driver.db);
      await repository.ensureSchema();

      const service = new SocialService(repository, credentials);
      service.attachTwitter(twitterFactory);
      service.attachConnectors(() => ({
        outlayerAppWalletAttach: async () => {
          throw new Error("wallet attach blew up");
        },
        outlayerCall: async () => {
          throw new Error("the run must not be reached");
        },
      }));

      const connect = await service.connectAccount("user-1", {
        platform: Platform.TWITTER,
        redirectUri: REDIRECT_URI,
      });

      await expect(
        service.completeConnect("user-1", {
          platform: Platform.TWITTER,
          code: "code-1",
          state: connect.state!,
        }),
      ).rejects.toThrow(/OutLayer wallet registration failed: wallet attach blew up/);
      expect(storeOutlayerSecretRowsMock).not.toHaveBeenCalled();

      const accounts = await repository.listAccounts("user-1");
      expect(accounts).toHaveLength(0);
    } finally {
      await driver.close();
    }
  });
});

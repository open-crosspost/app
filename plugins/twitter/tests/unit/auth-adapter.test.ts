import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthAdapter } from "../../src/adapters/auth";

const { generateOAuth2AuthLink, loginWithOAuth2, v2Me } = vi.hoisted(() => ({
  generateOAuth2AuthLink: vi.fn(),
  loginWithOAuth2: vi.fn(),
  v2Me: vi.fn(),
}));

vi.mock("twitter-api-v2", () => {
  class TwitterApi {
    v2 = { me: v2Me };
    generateOAuth2AuthLink = generateOAuth2AuthLink;
    loginWithOAuth2 = loginWithOAuth2;

    constructor(_credentials?: unknown) {
      void _credentials;
    }
  }

  return { TwitterApi };
});

const REDIRECT_URI = "https://opencrosspost.com/callback/x";
const SCOPES = ["offline.access", "tweet.read", "tweet.write", "users.read"];

describe("AuthAdapter", () => {
  let adapter: AuthAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AuthAdapter("client-id", "client-secret");
  });

  describe("getAuthUrl", () => {
    it("returns the authorization url with the pkce state and code verifier", async () => {
      generateOAuth2AuthLink.mockReturnValue({
        url: "https://x.com/i/oauth2/authorize?state=state-123",
        state: "state-123",
        codeVerifier: "verifier-456",
      });

      const result = await Effect.runPromise(
        adapter.getAuthUrl({ redirectUri: REDIRECT_URI, state: "state-123", scopes: SCOPES }),
      );

      expect(result).toEqual({
        url: "https://x.com/i/oauth2/authorize?state=state-123",
        state: "state-123",
        codeVerifier: "verifier-456",
      });
      expect(generateOAuth2AuthLink).toHaveBeenCalledWith(REDIRECT_URI, {
        scope: SCOPES,
        state: "state-123",
      });
    });
  });

  describe("exchangeCodeForToken", () => {
    it("prefers the scope X granted over the requested scopes", async () => {
      v2Me.mockResolvedValue({ data: { id: "x-user-1", username: "alice" } });
      loginWithOAuth2.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 7200,
        scope: ["tweet.write", "users.read"],
      });

      const token = await Effect.runPromise(
        adapter.exchangeCodeForToken({
          code: "auth-code",
          redirectUri: REDIRECT_URI,
          codeVerifier: "verifier-456",
          scopes: SCOPES,
        }),
      );

      expect(token.scope).toEqual(["tweet.write", "users.read"]);
      expect(token.refreshToken).toBe("refresh-token");
      expect(token.userId).toBe("x-user-1");
      expect(token.username).toBe("alice");
    });

    it("falls back to the requested scopes when X grants none", async () => {
      v2Me.mockResolvedValue({ data: { id: "x-user-1", username: "alice" } });
      loginWithOAuth2.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 7200,
      });

      const token = await Effect.runPromise(
        adapter.exchangeCodeForToken({
          code: "auth-code",
          redirectUri: REDIRECT_URI,
          codeVerifier: "verifier-456",
          scopes: SCOPES,
        }),
      );

      expect(token.scope).toEqual(SCOPES);
    });
  });
});

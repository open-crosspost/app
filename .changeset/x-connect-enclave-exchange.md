"api": minor
"ui": patch
---

Route the X connect flow through the connector's `exchange_code` enclave operation: the API dispatches the OAuth code + PKCE verifier to the OutLayer run (the same server-side bridge the scheduler uses) instead of calling X's token endpoint, reads the minted refresh token from the run answer under `connect.X_REFRESH_TOKEN`, and writes it into the caller's row via ECIES as before. The author row moves to the curated `X_OAUTH_CLIENT_ID`/`X_OAUTH_CLIENT_SECRET` keys (stored before the run so the enclave finds the client), the wallet registration now lands before the exchange dispatch, and the twitter plugin drops `X_CLIENT_SECRET` entirely — the consent URL keeps the public client id + PKCE. The UI classifies connector refusal prefixes (`credential_busy:`, `rate_limited:`, `credential_expired:`, `policy_denied:`, …) into curated `RATE_LIMITED`/`UNAUTHORIZED`/`PLATFORM_ERROR` error details, keeping the raw sentence in `details.raw`.

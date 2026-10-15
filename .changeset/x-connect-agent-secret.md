---
"api": minor
"ui": patch
---

Connect X accounts through the OutLayer agent-secret route: the manage page runs the X OAuth PKCE flow, stores the refresh token as the user's own OutLayer secrets row (X-Use-Owner-Secret, no secrets_ref), and the twitter plugin's auth adapter returns the PKCE pair. X OAuth client credentials are a single shared env pair (X_CLIENT_ID/X_CLIENT_SECRET) across app.api and plugins.twitter.

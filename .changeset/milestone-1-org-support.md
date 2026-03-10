---
"host": minor
"api": minor
"ui": minor
---

Multi-tenant organization support with Better Auth integration

- Added Better Auth organization plugin with teams support
- Implemented all authentication methods: NEAR, email/password, phone OTP, passkey, anonymous
- Personal organization auto-created for every non-anonymous user
- Organization management UI: browse, create, switch, invite members
- Real invitation flow with email notifications
- Dev-preview email/SMS transport (logs to .dev-preview/ directory)
- Account settings page for managing auth methods and security
- Removed placeholder org RPCs - now using Better Auth directly
- Added API key plugin support
- Updated milestone-1 documentation

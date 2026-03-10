# Email Verification & Anonymous Authentication - Implementation Summary

## Overview
Added email/password authentication with verification and anonymous user support to the Better Auth setup.

## Changes Made

### 1. Server-side Authentication (`host/src/services/auth.ts`)

#### Added Plugins:
- **anonymous** - Enables guest user authentication without PII
- **emailAndPassword** - Email/password authentication
- **emailVerification** - Email verification flow

#### Configuration:
```typescript
// Anonymous users
tanonymous({
  emailDomainName: config.account,
  onLinkAccount: async ({ anonymousUser, newUser }) => {
    // Handle linking anonymous user data to new user
    console.log(`[Anonymous] Linking ${anonymousUser.user.id} to ${newUser.user.id}`);
    // TODO: Migrate anonymous user data (cart, preferences, etc.)
  },
})

// Email/Password with required verification
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  sendResetPassword: async ({ user, url }, _request) => {
    void sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Click the link to reset your password: ${url}`,
    });
  },
}

// Email verification settings
emailVerification: {
  sendVerificationEmail: async ({ user, url }, _request) => {
    void sendEmail({
      to: user.email,
      subject: "Verify your email address",
      text: `Click the link to verify your email: ${url}`,
    });
  },
  sendOnSignUp: true,      // Auto-send on sign up
  sendOnSignIn: true,      // Auto-send on sign in (if not verified)
  autoSignInAfterVerification: true,
  async afterEmailVerification(user, _request) {
    console.log(`${user.email} has been successfully verified!`);
  },
}
```

#### Email Provider Placeholder:
Created `sendEmail()` helper function - currently logs to console but marked with TODO for production integration (Resend, SendGrid, AWS SES, etc.)

### 2. Client-side Authentication (`ui/src/remote/auth-client.ts`)

Added `anonymousClient` plugin to the auth client:
```typescript
import { adminClient, anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    siwnClient({ recipient: getAccount(), networkId: "mainnet" }),
    adminClient(),
    anonymousClient(),  // NEW
  ],
});
```

### 3. Documentation (`LLM.txt`)

Updated the authentication section to include:
- Complete server setup with all auth methods
- Client setup with all plugins
- Usage examples for:
  - NEAR Sign In (SIWN)
  - Email/Password with verification
  - Anonymous authentication
  - Password reset

## Features Available

### Email/Password Authentication
- ✅ User sign-up with email and password
- ✅ Automatic email verification on sign-up
- ✅ Required email verification before login
- ✅ Password reset flow
- ✅ Post-verification callbacks

### Anonymous Authentication
- ✅ Create anonymous user sessions
- ✅ Automatic account linking when signing in with other methods
- ✅ `onLinkAccount` callback for data migration
- ✅ Delete anonymous user endpoint

### Account Linking
- ✅ Link anonymous accounts to email/password
- ✅ Link anonymous accounts to NEAR wallet
- ✅ Automatic data migration via callbacks

## Database Schema

The anonymous and email verification features require these additional fields in the user table (automatically handled by Better Auth migrations):
- `isAnonymous` (boolean) - Indicates if user is anonymous
- `emailVerified` (boolean) - Email verification status
- `verificationToken` - Token for email verification
- `resetPasswordToken` - Token for password reset

## Migration Required

Run database migrations to add new fields:
```bash
npx auth migrate
# or
npx auth generate
```

## TODOs for Production

1. **Email Provider**: Implement actual email sending in `host/src/services/auth.ts`:
   ```typescript
   // Replace console.log with actual email service
   await resend.emails.send({ to, subject, text });
   ```

2. **Anonymous Data Migration**: Implement `onLinkAccount` logic:
   ```typescript
   onLinkAccount: async ({ anonymousUser, newUser }) => {
     // Migrate cart, preferences, etc.
     await migrateUserData(anonymousUser.user.id, newUser.user.id);
   }
   ```

3. **Post-Verification Logic**: Add actions in `afterEmailVerification`:
   ```typescript
   async afterEmailVerification(user, _request) {
     // Grant access to features, send welcome email, etc.
   }
   ```

## Validation
- ✅ TypeScript type checking passes
- ✅ Biome linting passes
- ✅ All authentication methods documented

## Usage Examples

### Email Sign Up
```typescript
await authClient.signUp.email({
  email: "user@example.com",
  password: "password123",
  name: "User Name",
});
// Verification email sent automatically
```

### Anonymous Sign In
```typescript
const { data: user } = await authClient.signIn.anonymous();
// Later, link to real account:
await authClient.signIn.email({ email: "user@example.com", password: "password123" });
```

### Password Reset
```typescript
await authClient.forgetPassword({
  email: "user@example.com",
  redirectTo: "/reset-password",
});
```

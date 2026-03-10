# Phone Number, Passkey, and Organization Features

## Overview

Three powerful authentication features have been added to the Better Auth setup:

1. **Phone Number Authentication** - OTP-based phone verification and sign-in
2. **Passkey Authentication** - WebAuthn/FIDO2 passwordless biometric authentication
3. **Organization Management** - Multi-tenant organization support with members, roles, and invitations

## Phone Number Authentication

### Server Configuration

```typescript
// host/src/services/auth.ts
phoneNumber({
  sendOTP: async ({ phoneNumber, code }, _ctx) => {
    void sendSMS({ phoneNumber, code });
  },
  signUpOnVerification: {
    getTempEmail: (phoneNumber) => `${phoneNumber}@${config.account}`,
    getTempName: (phoneNumber) => phoneNumber,
  },
})
```

### Client Usage

```typescript
// Send OTP to phone number
await authClient.phoneNumber.sendOtp({
  phoneNumber: "+1234567890"
});

// Verify phone number with OTP
await authClient.phoneNumber.verify({
  phoneNumber: "+1234567890",
  code: "123456"
});

// Sign in with phone number and password
await authClient.signIn.phoneNumber({
  phoneNumber: "+1234567890",
  password: "password123"
});

// Update phone number
await authClient.phoneNumber.sendOtp({ phoneNumber: "+1987654321" });
await authClient.phoneNumber.verify({
  phoneNumber: "+1987654321",
  code: "123456",
  updatePhoneNumber: true
});

// Password reset via phone
await authClient.phoneNumber.requestPasswordReset({
  phoneNumber: "+1234567890"
});
await authClient.phoneNumber.resetPassword({
  phoneNumber: "+1234567890",
  otp: "123456",
  newPassword: "newpassword123"
});
```

### Features

- ✅ OTP-based phone verification
- ✅ Sign up with phone number (auto-creates temp email)
- ✅ Sign in with phone + password
- ✅ Password reset via SMS
- ✅ Update phone number
- ✅ Customizable OTP length and expiration
- ✅ Rate limiting and brute force protection

### Production Setup

Replace the placeholder `sendSMS` function with actual SMS provider:

```typescript
// Using Twilio
import twilio from 'twilio';
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

async function sendSMS({ phoneNumber, code }: { phoneNumber: string; code: string }) {
  await twilioClient.messages.create({
    to: phoneNumber,
    from: process.env.TWILIO_PHONE,
    body: `Your verification code: ${code}`
  });
}
```

## Passkey Authentication

### Server Configuration

```typescript
// host/src/services/auth.ts
import { passkey } from "@better-auth/passkey";

plugins: [
  passkey(),
  // ... other plugins
]
```

### Client Configuration

```typescript
// ui/src/remote/auth-client.ts
import { passkeyClient } from "@better-auth/passkey/client";

plugins: [
  passkeyClient(),
  // ... other plugins
]
```

### Usage

```typescript
// Register a new passkey
await authClient.passkey.addPasskey({
  name: "My iPhone FaceID",
  authenticatorAttachment: "platform" // or "cross-platform"
});

// Sign in with passkey
await authClient.signIn.passkey({
  autoFill: true // Enable conditional UI/autofill
});

// List user passkeys
const { data: passkeys } = await authClient.passkey.listUserPasskeys();

// Update passkey name
await authClient.passkey.updatePasskey({
  id: "passkey-id",
  name: "New Name"
});

// Delete passkey
await authClient.passkey.deletePasskey({
  id: "passkey-id"
});
```

### Conditional UI (AutoFill)

Enable browser autofill for passkeys:

```html
<!-- Add webauthn to autocomplete -->
<input 
  type="text" 
  name="email" 
  autocomplete="username webauthn"
/>
<input 
  type="password" 
  name="password" 
  autocomplete="current-password webauthn"
/>
```

```typescript
// Preload passkeys on component mount
useEffect(() => {
  if (!PublicKeyCredential?.isConditionalMediationAvailable?.()) {
    return;
  }
  void authClient.signIn.passkey({ autoFill: true });
}, []);
```

### Features

- ✅ Passwordless biometric authentication
- ✅ FaceID/TouchID support on mobile
- ✅ Hardware security key support
- ✅ Cross-platform authenticators
- ✅ Conditional UI / Autofill
- ✅ Multiple passkeys per user
- ✅ Phishing-resistant

## Organization Management

### Server Configuration

```typescript
// host/src/services/auth.ts
organization({
  async sendInvitationEmail(data) {
    const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
    void sendEmail({
      to: data.email,
      subject: `Invitation to join ${data.organization.name}`,
      text: `You've been invited by ${data.inviter.user.name} to join ${data.organization.name}.\n\nAccept: ${inviteLink}`
    });
  }
})
```

### Client Configuration

```typescript
// ui/src/remote/auth-client.ts
import { organizationClient } from "better-auth/client/plugins";

plugins: [
  organizationClient(),
  // ... other plugins
]
```

### Usage Examples

#### Create and Manage Organizations

```typescript
// Create organization
const { data: org } = await authClient.organization.create({
  name: "My Organization",
  slug: "my-org"
});

// List user's organizations
const { data: organizations } = authClient.useListOrganizations();

// Set active organization
await authClient.organization.setActive({
  organizationId: "org-id"
});

// Get active organization
const { data: activeOrg } = authClient.useActiveOrganization();

// Update organization
await authClient.organization.update({
  organizationId: "org-id",
  data: {
    name: "Updated Name",
    logo: "https://example.com/logo.png"
  }
});

// Delete organization
await authClient.organization.delete({
  organizationId: "org-id"
});
```

#### Members and Invitations

```typescript
// Invite member
await authClient.organization.inviteMember({
  email: "user@example.com",
  role: "member", // or "admin"
  organizationId: "org-id"
});

// List members
const { data: members } = await authClient.organization.listMembers({
  organizationId: "org-id"
});

// Update member role
await authClient.organization.updateMemberRole({
  memberId: "member-id",
  role: "admin",
  organizationId: "org-id"
});

// Remove member
await authClient.organization.removeMember({
  memberIdOrEmail: "user@example.com",
  organizationId: "org-id"
});

// Accept invitation
await authClient.organization.acceptInvitation({
  invitationId: "invitation-id"
});

// List invitations
const { data: invitations } = await authClient.organization.listInvitations({
  organizationId: "org-id"
});
```

#### Access Control (Permissions)

```typescript
// Check if user has permission
const canCreateProject = await authClient.organization.hasPermission({
  permissions: {
    project: ["create"]
  }
});

// Check role permissions client-side
const canDeleteOrg = authClient.organization.checkRolePermission({
  permissions: {
    organization: ["delete"]
  },
  role: "admin"
});
```

### Default Roles

- **owner**: Full control (create, update, delete organization, manage members)
- **admin**: Can manage members and resources, cannot delete org or change owner
- **member**: Read-only access to organization data

### Custom Roles and Permissions

Define custom access control:

```typescript
// auth.ts
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  project: ["create", "update", "delete", "share"],
  billing: ["view", "manage"]
} as const;

const ac = createAccessControl(statement);

const customRole = ac.newRole({
  project: ["create", "update"],
  billing: ["view"]
});

organization({
  ac,
  roles: {
    owner: defaultRoles.owner,
    admin: defaultRoles.admin,
    member: defaultRoles.member,
    developer: customRole
  }
});
```

### Dynamic Roles (Runtime Created)

Enable dynamic role creation:

```typescript
// auth.ts
organization({
  ac,
  dynamicAccessControl: {
    enabled: true,
    maximumRolesPerOrganization: 10
  }
});
```

```typescript
// Create custom role at runtime
await authClient.organization.createRole({
  role: "custom-role",
  permission: {
    project: ["create"],
    billing: ["view"]
  }
});

// List custom roles
const { data: roles } = await authClient.organization.listOrgRoles();
```

### Teams (Sub-groups)

Enable teams within organizations:

```typescript
// auth.ts
organization({
  teams: {
    enabled: true,
    maximumTeams: 10,
    allowRemovingAllTeams: false
  }
});
```

```typescript
// Create team
await authClient.organization.createTeam({
  name: "Engineering",
  organizationId: "org-id"
});

// Add member to team
await authClient.organization.addTeamMember({
  teamId: "team-id",
  userId: "user-id"
});

// Invite to specific team
await authClient.organization.inviteMember({
  email: "user@example.com",
  role: "member",
  teamId: "team-id"
});
```

## Database Schema Changes

Run migrations to add new tables:

```bash
npx auth migrate
# or
npx auth generate
```

### New Tables Added

**Phone Number:**
- `phoneNumber` (string, optional) - User's phone number
- `phoneNumberVerified` (boolean) - Verification status

**Passkey:**
- `passkey` table - Stores WebAuthn credentials

**Organization:**
- `organization` - Organization data
- `member` - Organization memberships
- `invitation` - Pending invitations
- `team` (optional) - Teams within organizations
- `teamMember` (optional) - Team memberships
- `organizationRole` (optional) - Dynamic roles

## Migration Required

```bash
# Install dependencies
bun install

# Run database migrations
npx auth migrate

# Or generate schema only
npx auth generate
```

## Production Checklist

### Phone Number
- [ ] Set up SMS provider (Twilio, AWS SNS, Vonage)
- [ ] Implement `sendSMS` function
- [ ] Configure phone number validation rules
- [ ] Set up rate limiting

### Passkey
- [ ] Test on target browsers/devices
- [ ] Configure RP ID and origin for production domain
- [ ] Test backup/ recovery flows

### Organization
- [ ] Set up invitation email templates
- [ ] Configure role-based access control
- [ ] Test invitation flows
- [ ] Set up organization limits per user (if needed)
- [ ] Configure member limits per organization

## Usage Summary

All authentication methods are now available:

```typescript
// NEAR Wallet
await authClient.signIn.near({ ... });

// Email/Password
await authClient.signIn.email({ email, password });

// Anonymous
await authClient.signIn.anonymous();

// Phone Number
await authClient.signIn.phoneNumber({ phoneNumber, password });

// Passkey
await authClient.signIn.passkey({ autoFill: true });

// Organization management
await authClient.organization.create({ name, slug });
```

All methods support account linking and work together seamlessly!

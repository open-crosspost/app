import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { admin, anonymous, organization, phoneNumber } from "better-auth/plugins";
import { siwn } from "better-near-auth";

export const getPlugins = (config: {
  account: string;
  baseUrl: string;
  sendEmail: (data: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) => void | Promise<void>;
  sendSMS: (data: { phoneNumber: string; code: string }) => void | Promise<void>;
}) => [
  siwn({
    recipient: config.account,
  }),
  admin({
    defaultRole: "user",
    adminRoles: ["admin"],
  }),
  anonymous({
    emailDomainName: config.account,
  }),
  phoneNumber({
    sendOTP: async ({ phoneNumber, code }) => {
      await config.sendSMS({ phoneNumber, code });
    },
    signUpOnVerification: {
      getTempEmail: (phoneNumber) => `${phoneNumber}@${config.account}`,
      getTempName: (phoneNumber) => phoneNumber,
    },
  }),
  passkey(),
  organization({
    async sendInvitationEmail(data) {
      const inviteLink = `${config.baseUrl}/accept-invitation/${data.id}`;
      await config.sendEmail({
        to: data.email,
        subject: `Invitation to join ${data.organization.name}`,
        text: `You've been invited by ${data.inviter.user.name} (${data.inviter.user.email}) to join ${data.organization.name}.\n\nClick here to accept: ${inviteLink}`,
      });
    },
  }),
  apiKey(),
];

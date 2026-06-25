import { env } from "../../config/env";
import { sendMail } from "../../lib/mailer";

export async function sendAgentInviteEmail(to: string, name: string, rawToken: string): Promise<void> {
  const link = `${env.frontendUrl}/reset-password?token=${rawToken}`;
  await sendMail({
    to,
    subject: "You've been added as a Funlane agent",
    html: `<p>Hi ${name},</p><p>An admin has set up an agent account for you on the Funlane Agency Dashboard. Click the link below to set your password and log in:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`,
    text: `Hi ${name}, set your password to access the Funlane Agency Dashboard: ${link} (expires in 1 hour)`,
  });
}

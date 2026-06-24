import { env } from "../../config/env";
import { sendMail } from "../../lib/mailer";

export async function sendVerificationEmail(to: string, name: string, rawToken: string): Promise<void> {
  const link = `${env.frontendUrl}/verify-email?token=${rawToken}`;
  await sendMail({
    to,
    subject: "Verify your Funlane account",
    html: `<p>Hi ${name},</p><p>Welcome to Funlane. Please verify your email address by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    text: `Hi ${name}, verify your Funlane account: ${link} (expires in 24 hours)`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, rawToken: string): Promise<void> {
  const link = `${env.frontendUrl}/reset-password?token=${rawToken}`;
  await sendMail({
    to,
    subject: "Reset your Funlane password",
    html: `<p>Hi ${name},</p><p>We received a request to reset your password. Click the link below to choose a new one:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    text: `Hi ${name}, reset your Funlane password: ${link} (expires in 1 hour)`,
  });
}

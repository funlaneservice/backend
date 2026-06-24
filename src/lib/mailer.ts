import { Resend } from "resend";
import { env } from "../config/env";

const isConfigured = Boolean(env.resendApiKey);

const resend = isConfigured ? new Resend(env.resendApiKey) : null;

if (!isConfigured) {
  console.warn(
    "[mailer] RESEND_API_KEY not configured — emails will be logged to the console instead of sent."
  );
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  if (!resend) {
    console.info(`[mailer] (no-op) To: ${options.to} | Subject: ${options.subject}\n${options.text ?? options.html}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

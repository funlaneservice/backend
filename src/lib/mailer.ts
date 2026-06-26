import { Resend } from "resend";
import { env } from "../config/env";

const isConfigured = Boolean(env.resendApiKey);

const resend = isConfigured ? new Resend(env.resendApiKey) : null;

if (!isConfigured) {
  console.warn(
    "[mailer] RESEND_API_KEY not configured — emails will be logged to the console instead of sent."
  );
}

if (env.emailRedirectTo) {
  console.warn(
    `[mailer] EMAIL_REDIRECT_TO is set — all emails will be redirected to ${env.emailRedirectTo} instead of their real recipient. Remove this env var once a sending domain is verified in Resend.`
  );
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const redirectTo = env.emailRedirectTo;
  const actualOptions = redirectTo
    ? {
        ...options,
        to: redirectTo,
        subject: `[to: ${options.to}] ${options.subject}`,
        html: `<p><em>Originally addressed to ${options.to}</em></p>${options.html}`,
        text: options.text ? `(Originally addressed to ${options.to})\n${options.text}` : options.text,
      }
    : options;

  if (!resend) {
    console.info(
      `[mailer] (no-op) To: ${actualOptions.to} | Subject: ${actualOptions.subject}\n${actualOptions.text ?? actualOptions.html}`
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: actualOptions.to,
    subject: actualOptions.subject,
    html: actualOptions.html,
    text: actualOptions.text,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

export async function sendMailSafely(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (err) {
    console.error("[mailer] failed to send email:", err);
  }
}

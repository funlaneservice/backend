import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

const isConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

const transporter: Transporter | null = isConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    })
  : null;

if (!isConfigured) {
  console.warn(
    "[mailer] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing) — emails will be logged to the console instead of sent."
  );
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  if (!transporter) {
    console.info(`[mailer] (no-op) To: ${options.to} | Subject: ${options.subject}\n${options.text ?? options.html}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

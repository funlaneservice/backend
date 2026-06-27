import { env } from "../../config/env";
import { sendMail } from "../../lib/mailer";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendOptionsSentEmail(to: string, name: string, requestId: string): Promise<void> {
  const link = `${env.frontendUrl}/requests/${requestId}`;
  const safeName = escapeHtml(name);
  await sendMail({
    to,
    subject: "Your travel options are ready",
    html: `<p>Hi ${safeName},</p><p>Your agent has sent quote options for your travel request. Review them here:</p><p><a href="${link}">${link}</a></p>`,
    text: `Hi ${name}, your travel options are ready: ${link}`,
  });
}

export async function sendRequestApprovedEmail(to: string, name: string, requestId: string): Promise<void> {
  const link = `${env.frontendUrl}/agent/requests/${requestId}`;
  const safeName = escapeHtml(name);
  await sendMail({
    to,
    subject: "A client approved their quote",
    html: `<p>Hi ${safeName},</p><p>Your client approved a quote option for request ${requestId}. Please proceed to book and issue the ticket.</p><p><a href="${link}">${link}</a></p>`,
    text: `Hi ${name}, your client approved a quote for request ${requestId}: ${link}`,
  });
}

export async function sendRequestRejectedEmail(
  to: string,
  name: string,
  requestId: string,
  reason: string
): Promise<void> {
  const link = `${env.frontendUrl}/agent/requests/${requestId}`;
  const safeName = escapeHtml(name);
  const safeReason = escapeHtml(reason);
  await sendMail({
    to,
    subject: "A client rejected their quote options",
    html: `<p>Hi ${safeName},</p><p>Your client rejected the quote options for request ${requestId}.</p><p>Reason: ${safeReason}</p><p>Please revise and resend: <a href="${link}">${link}</a></p>`,
    text: `Hi ${name}, your client rejected the options for request ${requestId}. Reason: ${reason}. Revise here: ${link}`,
  });
}

export async function sendTicketCompletedEmail(to: string, name: string, requestId: string): Promise<void> {
  const link = `${env.frontendUrl}/requests/${requestId}`;
  const safeName = escapeHtml(name);
  await sendMail({
    to,
    subject: "Your ticket is ready",
    html: `<p>Hi ${safeName},</p><p>Your ticket has been issued. View your booking and download your ticket here:</p><p><a href="${link}">${link}</a></p>`,
    text: `Hi ${name}, your ticket is ready: ${link}`,
  });
}

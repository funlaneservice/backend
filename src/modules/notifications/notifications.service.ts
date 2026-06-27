import { prisma } from "../../lib/prisma";
import { sendMailSafely } from "../../lib/mailer";
import {
  sendOptionsSentEmail,
  sendRequestApprovedEmail,
  sendRequestRejectedEmail,
  sendTicketCompletedEmail,
} from "./notifications.mailer";

async function notifySafely(userId: string, send: (to: string, name: string) => Promise<void>): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return;
    }
    await sendMailSafely(() => send(user.email, user.name));
  } catch (err) {
    console.error("[notifications] failed to send notification:", err);
  }
}

export async function notifyOptionsSent(requestId: string, clientId: string): Promise<void> {
  await notifySafely(clientId, (to, name) => sendOptionsSentEmail(to, name, requestId));
}

export async function notifyRequestApproved(requestId: string, agentId: string): Promise<void> {
  await notifySafely(agentId, (to, name) => sendRequestApprovedEmail(to, name, requestId));
}

export async function notifyRequestRejected(requestId: string, agentId: string, reason: string): Promise<void> {
  await notifySafely(agentId, (to, name) => sendRequestRejectedEmail(to, name, requestId, reason));
}

export async function notifyTicketCompleted(requestId: string, clientId: string): Promise<void> {
  await notifySafely(clientId, (to, name) => sendTicketCompletedEmail(to, name, requestId));
}

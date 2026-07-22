import { Notification, NotificationType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { sendMailSafely } from "../../lib/mailer";
import { ApiError } from "../../utils/ApiError";
import {
  sendNewRequestCreatedEmail,
  sendOptionsSentEmail,
  sendRequestApprovedEmail,
  sendRequestRejectedEmail,
  sendTicketCompletedEmail,
} from "./notifications.mailer";
import { ListNotificationsQuery } from "./notifications.schema";

function koboToNaira(amountKobo: number): number {
  return amountKobo / 100;
}

async function createInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  requestId: string | null
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, title, message, requestId } });
  } catch (err) {
    console.error("[notifications] failed to create in-app notification:", err);
  }
}

// Emails and in-app rows are independent side effects — one failing (e.g. Resend down)
// must not stop the other (e.g. DB write) from happening, so they run via allSettled
// rather than sequentially inside a single try/catch.
async function notifySafely(
  userId: string,
  sendEmail: (to: string, name: string) => Promise<void>,
  inApp: { type: NotificationType; title: string; message: string; requestId: string | null }
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return;
    }
    await Promise.allSettled([
      sendMailSafely(() => sendEmail(user.email, user.name)),
      createInAppNotification(userId, inApp.type, inApp.title, inApp.message, inApp.requestId),
    ]);
  } catch (err) {
    console.error("[notifications] failed to send notification:", err);
  }
}

export async function notifyOptionsSent(requestId: string, clientId: string): Promise<void> {
  await notifySafely(clientId, (to, name) => sendOptionsSentEmail(to, name, requestId), {
    type: "OPTIONS_SENT",
    title: "Your travel options are ready",
    message: "Your agent has sent quote options for your travel request. Review and approve one to proceed.",
    requestId,
  });
}

export async function notifyRequestApproved(requestId: string, agentId: string): Promise<void> {
  await notifySafely(agentId, (to, name) => sendRequestApprovedEmail(to, name, requestId), {
    type: "REQUEST_APPROVED",
    title: "A client approved their quote",
    message: "Your client approved a quote option. Proceed to book and issue the ticket.",
    requestId,
  });
}

export async function notifyRequestRejected(requestId: string, agentId: string, reason: string): Promise<void> {
  await notifySafely(agentId, (to, name) => sendRequestRejectedEmail(to, name, requestId, reason), {
    type: "REQUEST_REJECTED",
    title: "A client rejected their quote options",
    message: `Your client rejected the quote options. Reason: ${reason}`,
    requestId,
  });
}

export async function notifyTicketCompleted(requestId: string, clientId: string): Promise<void> {
  await notifySafely(clientId, (to, name) => sendTicketCompletedEmail(to, name, requestId), {
    type: "TICKET_COMPLETED",
    title: "Your ticket is ready",
    message: "Your ticket has been issued. View your booking to download it.",
    requestId,
  });
}

// Fans out to every agent (regardless of ACTIVE/SUSPENDED status) since a suspended
// agent's reassignment eligibility isn't this hook's concern — it just announces the
// request landed in the shared queue. Per-recipient tasks run via allSettled so one
// agent's failed email/DB write doesn't stop the others from being notified.
export async function notifyNewRequestCreated(requestId: string, origin: string, destination: string): Promise<void> {
  try {
    const agents = await prisma.user.findMany({ where: { role: "AGENT" } });
    const tasks = agents.flatMap((agent) => [
      sendMailSafely(() => sendNewRequestCreatedEmail(agent.email, agent.name, origin, destination)),
      createInAppNotification(
        agent.id,
        "NEW_REQUEST_CREATED",
        "New travel request in the queue",
        `A new request (${origin} → ${destination}) was submitted and is unclaimed.`,
        requestId
      ),
    ]);
    await Promise.allSettled(tasks);
  } catch (err) {
    console.error("[notifications] failed to notify agents of new request:", err);
  }
}

// No email counterpart yet — in-app only.
export async function notifyWalletTopup(userId: string, amountKobo: number): Promise<void> {
  await createInAppNotification(
    userId,
    "WALLET_TOPUP",
    "Wallet top-up successful",
    `Your wallet was credited with ₦${koboToNaira(amountKobo).toLocaleString("en-NG")}.`,
    null
  );
}

function toNotificationView(notification: Notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    requestId: notification.requestId,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

function paginate(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  const where = { userId, ...(query.unreadOnly ? { readAt: null } : {}) };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications: notifications.map(toNotificationView),
    pagination: paginate(total, query.page, query.limit),
  };
}

export async function getUnreadCount(userId: string): Promise<{ count: number }> {
  const count = await prisma.notification.count({ where: { userId, readAt: null } });
  return { count };
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, "Notification not found");
  }

  const updated = notification.readAt
    ? notification
    : await prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });

  return toNotificationView(updated);
}

export async function markAllAsRead(userId: string): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { count: result.count };
}

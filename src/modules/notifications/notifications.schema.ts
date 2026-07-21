import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;

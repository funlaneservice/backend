import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  getUnreadCountHandler,
  listNotificationsHandler,
  markAllAsReadHandler,
  markAsReadHandler,
} from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", listNotificationsHandler);
notificationsRouter.get("/unread-count", getUnreadCountHandler);
notificationsRouter.patch("/read-all", markAllAsReadHandler);
notificationsRouter.patch("/:id/read", markAsReadHandler);

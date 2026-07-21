import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as notificationsService from "./notifications.service";
import { listNotificationsQuerySchema, notificationIdParamSchema } from "./notifications.schema";

export const listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const query = listNotificationsQuerySchema.parse(req.query);
  const result = await notificationsService.listNotifications(req.user.userId, query);
  sendResponse(res, 200, result);
});

export const getUnreadCountHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const result = await notificationsService.getUnreadCount(req.user.userId);
  sendResponse(res, 200, result);
});

export const markAsReadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const { id } = notificationIdParamSchema.parse(req.params);
  const notification = await notificationsService.markAsRead(req.user.userId, id);
  sendResponse(res, 200, { notification });
});

export const markAllAsReadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const result = await notificationsService.markAllAsRead(req.user.userId);
  sendResponse(res, 200, result);
});

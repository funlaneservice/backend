import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as settingsService from "./settings.service";
import { changePasswordSchema, updateProfileSchema } from "./settings.schema";

export const getProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const user = await settingsService.getProfile(req.user.userId);
  sendResponse(res, 200, { user });
});

export const updateProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = updateProfileSchema.parse(req.body);
  const user = await settingsService.updateProfile(req.user.userId, input);
  sendResponse(res, 200, { user });
});

export const changePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = changePasswordSchema.parse(req.body);
  const result = await settingsService.changePassword(req.user.userId, input);
  sendResponse(res, 200, result);
});

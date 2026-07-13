import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as authService from "./auth.service";
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schema";

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  sendResponse(res, 201, result);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  sendResponse(res, 200, result);
});

export const googleAuthHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = googleAuthSchema.parse(req.body);
  const result = await authService.googleAuth(input);
  sendResponse(res, 200, result);
});

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = verifyEmailSchema.parse(req.body);
  const result = await authService.verifyEmail(input);
  sendResponse(res, 200, result);
});

export const resendVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = resendVerificationSchema.parse(req.body);
  const result = await authService.resendVerification(input);
  sendResponse(res, 200, result);
});

export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = forgotPasswordSchema.parse(req.body);
  const result = await authService.forgotPassword(input);
  sendResponse(res, 200, result);
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = resetPasswordSchema.parse(req.body);
  const result = await authService.resetPassword(input);
  sendResponse(res, 200, result);
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const user = await authService.getUserById(req.user.userId);
  sendResponse(res, 200, user);
});

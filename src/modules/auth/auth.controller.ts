import { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as authService from "./auth.service";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schema";

function redirectToFrontendCallback(res: Response, params: Record<string, string>) {
  const url = new URL("/auth/google/callback", env.frontendUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  res.redirect(url.toString());
}

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

export const googleRedirectHandler = asyncHandler(async (req: Request, res: Response) => {
  try {
    const url = authService.googleAuthUrl();
    res.redirect(url);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "google_auth_unavailable";
    redirectToFrontendCallback(res, { error: message });
  }
});

export const googleCallbackHandler = asyncHandler(async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (typeof error === "string") {
    return redirectToFrontendCallback(res, { error });
  }
  if (typeof code !== "string") {
    return redirectToFrontendCallback(res, { error: "missing_code" });
  }

  try {
    const result = await authService.googleAuthCallback(code);
    redirectToFrontendCallback(res, { token: result.token });
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "google_auth_failed";
    redirectToFrontendCallback(res, { error: message });
  }
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

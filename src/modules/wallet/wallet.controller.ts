import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as walletService from "./wallet.service";
import { verifyWebhookSignature } from "../../lib/paystack";
import { initializeTopupBodySchema, listTransactionsQuerySchema, userIdParamSchema } from "./wallet.schema";

export const getMyWalletHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const wallet = await walletService.getWallet(req.user.userId);
  sendResponse(res, 200, { wallet });
});

export const getMyTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const query = listTransactionsQuerySchema.parse(req.query);
  const result = await walletService.getTransactions(req.user.userId, query);
  sendResponse(res, 200, result);
});

export const getUserWalletHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const wallet = await walletService.getWallet(userId);
  sendResponse(res, 200, { wallet });
});

export const getUserTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const query = listTransactionsQuerySchema.parse(req.query);
  const result = await walletService.getTransactions(userId, query);
  sendResponse(res, 200, result);
});

export const initializeTopupHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const body = initializeTopupBodySchema.parse(req.body);
  const result = await walletService.initializeTopup(req.user.userId, body.amount);
  sendResponse(res, 200, result);
});

export const paystackWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers["x-paystack-signature"] as string | undefined;
  if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
    throw new ApiError(401, "Invalid Paystack signature");
  }

  const { event, data } = req.body as { event?: string; data?: { id: number; reference: string } };
  if (!event || !data) {
    throw new ApiError(400, "Malformed webhook payload");
  }

  try {
    await walletService.handlePaystackWebhook(event, data);
  } catch (err) {
    // Non-2xx tells Paystack to retry delivery — safe here since handlePaystackWebhook
    // is idempotent on eventId, and there's no in-process retry/queue for webhooks yet.
    console.error("[paystack webhook] processing failed:", err);
    res.status(500).json({ statusCode: 500, message: "Webhook processing failed" });
    return;
  }

  sendResponse(res, 200, {});
});

import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as walletService from "./wallet.service";
import { listTransactionsQuerySchema, userIdParamSchema } from "./wallet.schema";

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

export const initializeTopupHandler = asyncHandler(async (_req: Request, res: Response) => {
  await walletService.initializeTopup();
  sendResponse(res, 200, {});
});

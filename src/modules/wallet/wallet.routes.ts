import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import {
  getMyTransactionsHandler,
  getMyWalletHandler,
  getUserTransactionsHandler,
  getUserWalletHandler,
  initializeTopupHandler,
} from "./wallet.controller";

export const walletRouter = Router();

walletRouter.get("/me", requireAuth, requireRole("CLIENT"), getMyWalletHandler);
walletRouter.get("/me/transactions", requireAuth, requireRole("CLIENT"), getMyTransactionsHandler);
walletRouter.post("/topup/initialize", requireAuth, requireRole("CLIENT"), initializeTopupHandler);
walletRouter.get("/:userId", requireAuth, requireRole("ADMIN"), getUserWalletHandler);
walletRouter.get("/:userId/transactions", requireAuth, requireRole("ADMIN"), getUserTransactionsHandler);

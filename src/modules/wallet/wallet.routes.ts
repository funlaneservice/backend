import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import {
  getMyTransactionsHandler,
  getMyWalletHandler,
  getUserTransactionsHandler,
  getUserWalletHandler,
  initializeTopupHandler,
  paystackWebhookHandler,
} from "./wallet.controller";

export const walletRouter = Router();

// Called by Paystack directly (no user session) — authenticated via HMAC signature
// verification inside the handler instead of requireAuth.
walletRouter.post("/webhook/paystack", paystackWebhookHandler);

walletRouter.get("/me", requireAuth, requireRole("CLIENT"), getMyWalletHandler);
walletRouter.get("/me/transactions", requireAuth, requireRole("CLIENT"), getMyTransactionsHandler);
walletRouter.post("/topup/initialize", requireAuth, requireRole("CLIENT"), initializeTopupHandler);
walletRouter.get("/:userId", requireAuth, requireRole("ADMIN"), getUserWalletHandler);
walletRouter.get("/:userId/transactions", requireAuth, requireRole("ADMIN"), getUserTransactionsHandler);

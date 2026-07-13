import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  forgotPasswordHandler,
  googleCallbackHandler,
  googleRedirectHandler,
  loginHandler,
  meHandler,
  registerHandler,
  resendVerificationHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.get("/google", googleRedirectHandler);
authRouter.get("/google/callback", googleCallbackHandler);
authRouter.post("/verify-email", verifyEmailHandler);
authRouter.post("/resend-verification", resendVerificationHandler);
authRouter.post("/forgot-password", forgotPasswordHandler);
authRouter.post("/reset-password", resetPasswordHandler);
authRouter.get("/me", requireAuth, meHandler);

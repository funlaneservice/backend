import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  forgotPasswordHandler,
  googleAuthHandler,
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
authRouter.post("/google", googleAuthHandler);
authRouter.post("/verify-email", verifyEmailHandler);
authRouter.post("/resend-verification", resendVerificationHandler);
authRouter.post("/forgot-password", forgotPasswordHandler);
authRouter.post("/reset-password", resetPasswordHandler);
authRouter.get("/me", requireAuth, meHandler);

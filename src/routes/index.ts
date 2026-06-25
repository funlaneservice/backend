import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ statusCode: 200, status: "ok" });
});

apiRouter.use("/auth", authRouter);

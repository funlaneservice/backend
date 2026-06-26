import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  claimRequestHandler,
  createRequestHandler,
  getQueueHandler,
  getRequestHandler,
  listMyRequestsHandler,
} from "./requests.controller";

export const requestsRouter = Router();

requestsRouter.post(
  "/",
  requireAuth,
  requireRole("CLIENT"),
  upload.array("passportDocs"),
  createRequestHandler
);
requestsRouter.get("/mine", requireAuth, requireRole("CLIENT"), listMyRequestsHandler);
requestsRouter.get("/queue", requireAuth, requireRole("AGENT", "ADMIN"), getQueueHandler);
requestsRouter.post("/:id/claim", requireAuth, requireRole("AGENT"), claimRequestHandler);
requestsRouter.get("/:id", requireAuth, getRequestHandler);

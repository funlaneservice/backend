import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  addQuoteOptionHandler,
  approveRequestHandler,
  cancelRequestHandler,
  claimRequestHandler,
  completeRequestHandler,
  createRequestHandler,
  deleteQuoteOptionHandler,
  getQueueHandler,
  getRequestHandler,
  issueTicketHandler,
  listMyRequestsHandler,
  rejectRequestHandler,
  sendOptionsHandler,
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
requestsRouter.post("/:id/options", requireAuth, requireRole("AGENT"), addQuoteOptionHandler);
requestsRouter.delete("/:id/options/:optionId", requireAuth, requireRole("AGENT"), deleteQuoteOptionHandler);
requestsRouter.post("/:id/send-options", requireAuth, requireRole("AGENT"), sendOptionsHandler);
requestsRouter.post("/:id/reject", requireAuth, requireRole("CLIENT"), rejectRequestHandler);
requestsRouter.post("/:id/approve", requireAuth, requireRole("CLIENT"), approveRequestHandler);
requestsRouter.post("/:id/cancel", requireAuth, requireRole("CLIENT"), cancelRequestHandler);
requestsRouter.post(
  "/:id/ticket",
  requireAuth,
  requireRole("AGENT"),
  upload.single("ticket"),
  issueTicketHandler
);
requestsRouter.post("/:id/complete", requireAuth, requireRole("AGENT"), completeRequestHandler);
requestsRouter.get("/:id", requireAuth, getRequestHandler);

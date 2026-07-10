import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  addQuoteOptionHandler,
  adminCancelRequestHandler,
  adminForceStatusHandler,
  adminListRequestsHandler,
  adminReassignAgentHandler,
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
  requireRole("CLIENT", "ADMIN"),
  upload.array("passportDocs"),
  createRequestHandler
);
requestsRouter.get("/", requireAuth, requireRole("ADMIN"), adminListRequestsHandler);
requestsRouter.get("/mine", requireAuth, requireRole("CLIENT"), listMyRequestsHandler);
requestsRouter.get("/queue", requireAuth, requireRole("AGENT", "ADMIN"), getQueueHandler);
requestsRouter.post("/:id/claim", requireAuth, requireRole("AGENT"), claimRequestHandler);
requestsRouter.post("/:id/options", requireAuth, requireRole("AGENT", "ADMIN"), addQuoteOptionHandler);
requestsRouter.delete(
  "/:id/options/:optionId",
  requireAuth,
  requireRole("AGENT", "ADMIN"),
  deleteQuoteOptionHandler
);
requestsRouter.post("/:id/send-options", requireAuth, requireRole("AGENT", "ADMIN"), sendOptionsHandler);
requestsRouter.post("/:id/reject", requireAuth, requireRole("CLIENT", "ADMIN"), rejectRequestHandler);
requestsRouter.post("/:id/approve", requireAuth, requireRole("CLIENT", "ADMIN"), approveRequestHandler);
requestsRouter.post("/:id/cancel", requireAuth, requireRole("CLIENT", "ADMIN"), cancelRequestHandler);
requestsRouter.post("/:id/admin-cancel", requireAuth, requireRole("ADMIN"), adminCancelRequestHandler);
requestsRouter.patch("/:id/assign", requireAuth, requireRole("ADMIN"), adminReassignAgentHandler);
requestsRouter.patch("/:id/status", requireAuth, requireRole("ADMIN"), adminForceStatusHandler);
requestsRouter.post(
  "/:id/ticket",
  requireAuth,
  requireRole("AGENT", "ADMIN"),
  upload.single("ticket"),
  issueTicketHandler
);
requestsRouter.post("/:id/complete", requireAuth, requireRole("AGENT", "ADMIN"), completeRequestHandler);
requestsRouter.get("/:id", requireAuth, getRequestHandler);

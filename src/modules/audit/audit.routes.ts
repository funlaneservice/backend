import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { listAuditLogsHandler } from "./audit.controller";

export const auditRouter = Router();

auditRouter.use(requireAuth, requireRole("ADMIN"));

auditRouter.get("/", listAuditLogsHandler);

import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { getLegalDocumentHandler, updateLegalDocumentHandler } from "./legal.controller";

export const legalRouter = Router();

legalRouter.get("/:type", getLegalDocumentHandler);

export const legalAdminRouter = Router();

legalAdminRouter.use(requireAuth, requireRole("ADMIN"));

legalAdminRouter.put("/:type", updateLegalDocumentHandler);

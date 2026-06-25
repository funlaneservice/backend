import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { adminLoginHandler, bootstrapAdminHandler, createAdminHandler } from "./admin.controller";

export const adminRouter = Router();

adminRouter.post("/auth/login", adminLoginHandler);
adminRouter.post("/auth/bootstrap", bootstrapAdminHandler);
adminRouter.post("/admins", requireAuth, requireRole("ADMIN"), createAdminHandler);

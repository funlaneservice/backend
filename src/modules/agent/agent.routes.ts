import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { agentLoginHandler, createAgentHandler } from "./agent.controller";

export const agentRouter = Router();
agentRouter.post("/auth/login", agentLoginHandler);

export const agentAdminRouter = Router();
agentAdminRouter.post("/", requireAuth, requireRole("ADMIN"), createAgentHandler);

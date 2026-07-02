import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { changePasswordHandler, getProfileHandler, updateProfileHandler } from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.use(requireAuth, requireRole("CLIENT", "AGENT"));

settingsRouter.get("/me", getProfileHandler);
settingsRouter.patch("/profile", updateProfileHandler);
settingsRouter.post("/change-password", changePasswordHandler);

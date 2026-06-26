import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import {
  changeUserRoleHandler,
  deleteUserHandler,
  getUserHandler,
  listUsersHandler,
  reactivateUserHandler,
  suspendUserHandler,
  updateUserHandler,
} from "./users.controller";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("ADMIN"));

usersRouter.get("/", listUsersHandler);
usersRouter.get("/:id", getUserHandler);
usersRouter.patch("/:id", updateUserHandler);
usersRouter.patch("/:id/role", changeUserRoleHandler);
usersRouter.post("/:id/suspend", suspendUserHandler);
usersRouter.post("/:id/reactivate", reactivateUserHandler);
usersRouter.delete("/:id", deleteUserHandler);

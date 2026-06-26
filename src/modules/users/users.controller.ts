import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as usersService from "./users.service";
import {
  changeUserRoleSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from "./users.schema";

function requireActingAdmin(req: Request): string {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  return req.user.userId;
}

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const result = await usersService.listUsers(query);
  sendResponse(res, 200, result);
});

export const getUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = userIdParamSchema.parse(req.params);
  const user = await usersService.getUser(id);
  sendResponse(res, 200, { user });
});

export const updateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = userIdParamSchema.parse(req.params);
  const input = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(id, input);
  sendResponse(res, 200, { user });
});

export const changeUserRoleHandler = asyncHandler(async (req: Request, res: Response) => {
  const actingAdminId = requireActingAdmin(req);
  const { id } = userIdParamSchema.parse(req.params);
  const input = changeUserRoleSchema.parse(req.body);
  const user = await usersService.changeUserRole(actingAdminId, id, input);
  sendResponse(res, 200, { user });
});

export const suspendUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const actingAdminId = requireActingAdmin(req);
  const { id } = userIdParamSchema.parse(req.params);
  const user = await usersService.suspendUser(actingAdminId, id);
  sendResponse(res, 200, { user });
});

export const reactivateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = userIdParamSchema.parse(req.params);
  const user = await usersService.reactivateUser(id);
  sendResponse(res, 200, { user });
});

export const deleteUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const actingAdminId = requireActingAdmin(req);
  const { id } = userIdParamSchema.parse(req.params);
  await usersService.deleteUser(actingAdminId, id);
  sendResponse(res, 200, { message: "User deleted successfully" });
});

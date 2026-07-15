import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as adminService from "./admin.service";
import { getRequestContext } from "../audit/audit.service";
import { adminLoginSchema, bootstrapAdminSchema, createAdminSchema } from "./admin.schema";

export const adminLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = adminLoginSchema.parse(req.body);
  const result = await adminService.adminLogin(input, getRequestContext(req));
  sendResponse(res, 200, result);
});

export const bootstrapAdminHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = bootstrapAdminSchema.parse(req.body);
  const result = await adminService.bootstrapAdmin(input, getRequestContext(req));
  sendResponse(res, 201, result);
});

export const createAdminHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = createAdminSchema.parse(req.body);
  const result = await adminService.createAdmin(req.user.userId, input, getRequestContext(req));
  sendResponse(res, 201, result);
});

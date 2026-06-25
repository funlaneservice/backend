import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as adminService from "./admin.service";
import { adminLoginSchema, bootstrapAdminSchema, createAdminSchema } from "./admin.schema";

export const adminLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = adminLoginSchema.parse(req.body);
  const result = await adminService.adminLogin(input);
  sendResponse(res, 200, result);
});

export const bootstrapAdminHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = bootstrapAdminSchema.parse(req.body);
  const result = await adminService.bootstrapAdmin(input);
  sendResponse(res, 201, result);
});

export const createAdminHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createAdminSchema.parse(req.body);
  const result = await adminService.createAdmin(input);
  sendResponse(res, 201, result);
});

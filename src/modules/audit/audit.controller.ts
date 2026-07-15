import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as auditService from "./audit.service";
import { listAuditLogsQuerySchema } from "./audit.schema";

export const listAuditLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = listAuditLogsQuerySchema.parse(req.query);
  const result = await auditService.listAuditLogs(query);
  sendResponse(res, 200, result);
});

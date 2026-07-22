import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as legalService from "./legal.service";
import { getRequestContext } from "../audit/audit.service";
import { legalTypeParamSchema, updateLegalDocumentSchema } from "./legal.schema";

export const getLegalDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const { type } = legalTypeParamSchema.parse(req.params);
  const result = await legalService.getLegalDocument(type);
  sendResponse(res, 200, result);
});

export const updateLegalDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const { type } = legalTypeParamSchema.parse(req.params);
  const { content } = updateLegalDocumentSchema.parse(req.body);
  const result = await legalService.updateLegalDocument(type, content, req.user.userId, getRequestContext(req));
  sendResponse(res, 200, result);
});

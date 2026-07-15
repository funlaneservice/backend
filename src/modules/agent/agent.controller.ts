import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as agentService from "./agent.service";
import { getRequestContext } from "../audit/audit.service";
import { agentLoginSchema, createAgentSchema } from "./agent.schema";

export const agentLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = agentLoginSchema.parse(req.body);
  const result = await agentService.agentLogin(input, getRequestContext(req));
  sendResponse(res, 200, result);
});

export const createAgentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = createAgentSchema.parse(req.body);
  const result = await agentService.createAgent(req.user.userId, input, getRequestContext(req));
  sendResponse(res, 201, result);
});

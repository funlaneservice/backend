import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as agentService from "./agent.service";
import { agentLoginSchema, createAgentSchema } from "./agent.schema";

export const agentLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = agentLoginSchema.parse(req.body);
  const result = await agentService.agentLogin(input);
  sendResponse(res, 200, result);
});

export const createAgentHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createAgentSchema.parse(req.body);
  const result = await agentService.createAgent(input);
  sendResponse(res, 201, result);
});

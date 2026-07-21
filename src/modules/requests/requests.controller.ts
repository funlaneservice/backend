import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import { getRequestContext } from "../audit/audit.service";
import * as requestsService from "./requests.service";
import {
  adminForceStatusSchema,
  adminListRequestsQuerySchema,
  adminReassignRequestSchema,
  approveRequestSchema,
  cancelRequestSchema,
  createRequestSchema,
  listMyRequestsQuerySchema,
  queueQuerySchema,
  quoteOptionInputSchema,
  rejectRequestSchema,
  requestIdParamSchema,
  requestOptionParamSchema,
} from "./requests.schema";

export const createRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  let passengers: unknown;
  try {
    passengers = JSON.parse(typeof req.body.passengers === "string" ? req.body.passengers : "");
  } catch {
    throw new ApiError(400, "passengers must be a JSON-encoded array");
  }

  const input = createRequestSchema.parse({ ...req.body, passengers });
  const files = (req.files as Express.Multer.File[]) ?? [];

  const request = await requestsService.createRequest(
    req.user.userId,
    req.user.role,
    input,
    files,
    getRequestContext(req)
  );
  sendResponse(res, 201, { request });
});

export const listMyRequestsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const query = listMyRequestsQuerySchema.parse(req.query);
  const result = await requestsService.listMyRequests(req.user.userId, query);
  sendResponse(res, 200, result);
});

export const adminListRequestsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminListRequestsQuerySchema.parse(req.query);
  const result = await requestsService.adminListRequests(query);
  sendResponse(res, 200, result);
});

export const getQueueHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const query = queueQuerySchema.parse(req.query);
  const result = await requestsService.getQueue(req.user.userId, query);
  sendResponse(res, 200, result);
});

export const getRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const request = await requestsService.getRequestById(req.user, id);
  sendResponse(res, 200, { request });
});

export const claimRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const request = await requestsService.claimRequest(req.user.userId, id, getRequestContext(req));
  sendResponse(res, 200, { request });
});

export const addQuoteOptionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const input = quoteOptionInputSchema.parse(req.body);
  const option = await requestsService.addQuoteOption(req.user.userId, req.user.role, id, input);
  sendResponse(res, 201, { option });
});

export const deleteQuoteOptionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id, optionId } = requestOptionParamSchema.parse(req.params);
  await requestsService.deleteQuoteOption(req.user.userId, req.user.role, id, optionId);
  sendResponse(res, 200, { message: "Quote option deleted" });
});

export const sendOptionsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const request = await requestsService.sendOptions(
    req.user.userId,
    req.user.role,
    id,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const rejectRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const input = rejectRequestSchema.parse(req.body);
  const request = await requestsService.rejectOptions(
    req.user.userId,
    req.user.role,
    id,
    input,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const approveRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const input = approveRequestSchema.parse(req.body);
  const request = await requestsService.approveOption(
    req.user.userId,
    req.user.role,
    id,
    input,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const cancelRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const input = cancelRequestSchema.parse(req.body);
  const request = await requestsService.cancelRequest(
    req.user.userId,
    req.user.role,
    id,
    input,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const adminCancelRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const input = cancelRequestSchema.parse(req.body);
  const request = await requestsService.adminCancelRequest(
    req.user.userId,
    id,
    input,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const adminReassignAgentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const input = adminReassignRequestSchema.parse(req.body);
  const request = await requestsService.adminReassignAgent(
    req.user.userId,
    id,
    input.agentId,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const adminForceStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const input = adminForceStatusSchema.parse(req.body);
  const request = await requestsService.adminForceStatus(
    req.user.userId,
    id,
    input,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const issueTicketHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    throw new ApiError(400, "A ticket file is required");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const request = await requestsService.issueTicket(
    req.user.userId,
    req.user.role,
    id,
    file,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

export const completeRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const { id } = requestIdParamSchema.parse(req.params);
  const request = await requestsService.completeRequest(
    req.user.userId,
    req.user.role,
    id,
    getRequestContext(req)
  );
  sendResponse(res, 200, { request });
});

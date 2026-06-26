import { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendResponse } from "../../utils/apiResponse";
import * as requestsService from "./requests.service";
import {
  createRequestSchema,
  listMyRequestsQuerySchema,
  queueQuerySchema,
  requestIdParamSchema,
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

  const request = await requestsService.createRequest(req.user.userId, input, files);
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
  const request = await requestsService.claimRequest(req.user.userId, id);
  sendResponse(res, 200, { request });
});

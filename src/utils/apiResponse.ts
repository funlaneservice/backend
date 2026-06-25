import { Response } from "express";

export function sendResponse(
  res: Response,
  statusCode: number,
  body: Record<string, unknown> = {}
): void {
  res.status(statusCode).json({ statusCode, ...body });
}

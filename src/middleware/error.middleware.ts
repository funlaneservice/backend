import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";
import { isProduction } from "../config/env";

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json({ statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ statusCode: 400, message: "Validation failed", errors: err.flatten() });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ statusCode: err.statusCode, message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({
    statusCode: 500,
    message: "Internal server error",
    ...(isProduction ? {} : { error: err instanceof Error ? err.stack : err }),
  });
}

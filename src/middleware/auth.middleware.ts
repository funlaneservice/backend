import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { verifyToken } from "../utils/jwt";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(401, "Missing or invalid Authorization header");
    }

    const token = header.slice("Bearer ".length);

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new ApiError(401, "Invalid or expired token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, passwordChangedAt: true, status: true },
    });

    if (!user) {
      throw new ApiError(401, "Account not found");
    }

    if (user.passwordChangedAt && (!payload.iat || payload.iat * 1000 < user.passwordChangedAt.getTime())) {
      throw new ApiError(401, "Session expired, please log in again");
    }

    if (user.status === "SUSPENDED") {
      throw new ApiError(403, "This account has been suspended");
    }

    // Use the live DB role, not the JWT's embedded claim — otherwise a role change
    // (e.g. admin demotes an agent) wouldn't take effect until the token expires.
    req.user = { ...payload, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "Insufficient permissions");
    }
    next();
  };
}

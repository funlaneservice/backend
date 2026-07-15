import { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AuditAction, ListAuditLogsQuery } from "./audit.schema";

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export function getRequestContext(req: Request): RequestContext {
  return {
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

interface RecordAuditEventInput extends RequestContext {
  action: AuditAction;
  status: "SUCCESS" | "FAILURE";
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        status: input.status,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorRole: input.actorRole ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ipAddress: input.ip,
        userAgent: input.userAgent,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record audit event:", err);
  }
}

function toAuditLogView(log: {
  id: string;
  action: string;
  status: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}) {
  return {
    id: log.id,
    action: log.action,
    status: log.status,
    actorId: log.actorId,
    actorEmail: log.actorEmail,
    actorRole: log.actorRole,
    targetType: log.targetType,
    targetId: log.targetId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: log.metadata,
    createdAt: log.createdAt,
  };
}

function paginate(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listAuditLogs(query: ListAuditLogsQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.targetId ? { targetId: query.targetId } : {}),
    ...(query.search ? { actorEmail: { contains: query.search, mode: "insensitive" } } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map(toAuditLogView),
    pagination: paginate(total, query.page, query.limit),
  };
}

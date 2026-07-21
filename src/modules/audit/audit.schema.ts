import { z } from "zod";

export const AUDIT_ACTIONS = [
  "AUTH_REGISTER",
  "AUTH_LOGIN",
  "AUTH_GOOGLE_LOGIN",
  "AUTH_EMAIL_VERIFIED",
  "AUTH_PASSWORD_RESET_REQUESTED",
  "AUTH_PASSWORD_RESET_COMPLETED",
  "ADMIN_LOGIN",
  "ADMIN_BOOTSTRAPPED",
  "ADMIN_CREATED",
  "AGENT_LOGIN",
  "AGENT_CREATED",
  "USER_UPDATED",
  "USER_ROLE_CHANGED",
  "USER_SUSPENDED",
  "USER_REACTIVATED",
  "USER_DELETED",
  "REQUEST_CREATED",
  "REQUEST_CLAIMED",
  "REQUEST_OPTIONS_SENT",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "REQUEST_CANCELLED",
  "REQUEST_ADMIN_CANCELLED",
  "REQUEST_ADMIN_REASSIGNED",
  "REQUEST_ADMIN_FORCE_STATUS",
  "REQUEST_TICKET_ISSUED",
  "REQUEST_COMPLETED",
  "WALLET_TOPUP_COMPLETED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_STATUSES = ["SUCCESS", "FAILURE"] as const;

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.enum(AUDIT_ACTIONS).optional(),
  status: z.enum(AUDIT_STATUSES).optional(),
  actorId: z.string().uuid().optional(),
  targetType: z.string().min(1).max(50).optional(),
  targetId: z.string().min(1).max(100).optional(),
  search: z.string().min(1).max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

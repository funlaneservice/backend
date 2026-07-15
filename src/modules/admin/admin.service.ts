import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";
import { signToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import { recordAuditEvent, RequestContext } from "../audit/audit.service";
import { AdminLoginInput, BootstrapAdminInput, CreateAdminInput } from "./admin.schema";

function toPublicAdmin(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function adminLogin(input: AdminLoginInput, ctx: RequestContext) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await comparePassword(input.password, user.password))) {
    await recordAuditEvent({
      action: "ADMIN_LOGIN",
      status: "FAILURE",
      actorEmail: input.email,
      metadata: { reason: "invalid_credentials" },
      ...ctx,
    });
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.role !== "ADMIN") {
    await recordAuditEvent({
      action: "ADMIN_LOGIN",
      status: "FAILURE",
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      metadata: { reason: "not_admin" },
      ...ctx,
    });
    throw new ApiError(403, "This account does not have admin access");
  }

  if (user.status === "SUSPENDED") {
    await recordAuditEvent({
      action: "ADMIN_LOGIN",
      status: "FAILURE",
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      metadata: { reason: "suspended" },
      ...ctx,
    });
    throw new ApiError(403, "This account has been suspended");
  }

  const token = signToken({ userId: user.id, role: user.role });
  await recordAuditEvent({
    action: "ADMIN_LOGIN",
    status: "SUCCESS",
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    ...ctx,
  });
  return { admin: toPublicAdmin(user), token };
}

export async function bootstrapAdmin(input: BootstrapAdminInput, ctx: RequestContext) {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    throw new ApiError(403, "An admin account already exists. Ask an existing admin to create new admins.");
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const password = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      password,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  const token = signToken({ userId: user.id, role: user.role });
  await recordAuditEvent({
    action: "ADMIN_BOOTSTRAPPED",
    status: "SUCCESS",
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    targetType: "User",
    targetId: user.id,
    ...ctx,
  });
  return { admin: toPublicAdmin(user), token };
}

export async function createAdmin(actingAdminId: string, input: CreateAdminInput, ctx: RequestContext) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const password = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      password,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  await recordAuditEvent({
    action: "ADMIN_CREATED",
    status: "SUCCESS",
    actorId: actingAdminId,
    targetType: "User",
    targetId: user.id,
    metadata: { createdEmail: user.email },
    ...ctx,
  });

  return { admin: toPublicAdmin(user) };
}

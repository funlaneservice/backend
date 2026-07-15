import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { sendMailSafely } from "../../lib/mailer";
import { issuePasswordResetToken } from "../../lib/verificationTokens";
import { ApiError } from "../../utils/ApiError";
import { signToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import { recordAuditEvent, RequestContext } from "../audit/audit.service";
import { sendAgentInviteEmail } from "./agent.mailer";
import { AgentLoginInput, CreateAgentInput } from "./agent.schema";

function toPublicAgent(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function agentLogin(input: AgentLoginInput, ctx: RequestContext) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await comparePassword(input.password, user.password))) {
    await recordAuditEvent({
      action: "AGENT_LOGIN",
      status: "FAILURE",
      actorEmail: input.email,
      metadata: { reason: "invalid_credentials" },
      ...ctx,
    });
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.role !== "AGENT") {
    await recordAuditEvent({
      action: "AGENT_LOGIN",
      status: "FAILURE",
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      metadata: { reason: "not_agent" },
      ...ctx,
    });
    throw new ApiError(403, "This account does not have agent access");
  }

  if (user.status === "SUSPENDED") {
    await recordAuditEvent({
      action: "AGENT_LOGIN",
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
    action: "AGENT_LOGIN",
    status: "SUCCESS",
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    ...ctx,
  });
  return { agent: toPublicAgent(user), token };
}

export async function createAgent(actingAdminId: string, input: CreateAgentInput, ctx: RequestContext) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const unusablePassword = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      password: unusablePassword,
      role: "AGENT",
      emailVerifiedAt: new Date(),
    },
  });

  const rawToken = await issuePasswordResetToken(user.id);
  await sendMailSafely(() => sendAgentInviteEmail(user.email, user.name, rawToken));

  await recordAuditEvent({
    action: "AGENT_CREATED",
    status: "SUCCESS",
    actorId: actingAdminId,
    targetType: "User",
    targetId: user.id,
    metadata: { createdEmail: user.email },
    ...ctx,
  });

  return { agent: toPublicAgent(user) };
}

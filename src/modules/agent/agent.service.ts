import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { sendMailSafely } from "../../lib/mailer";
import { issuePasswordResetToken } from "../../lib/verificationTokens";
import { ApiError } from "../../utils/ApiError";
import { signToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import { sendAgentInviteEmail } from "./agent.mailer";
import { AgentLoginInput, CreateAgentInput } from "./agent.schema";

function toPublicAgent(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function agentLogin(input: AgentLoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await comparePassword(input.password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.role !== "AGENT") {
    throw new ApiError(403, "This account does not have agent access");
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { agent: toPublicAgent(user), token };
}

export async function createAgent(input: CreateAgentInput) {
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

  return { agent: toPublicAgent(user) };
}

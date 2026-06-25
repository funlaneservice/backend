import { prisma } from "./prisma";
import { generateToken, TOKEN_TTL_MS } from "../utils/verificationToken";

export async function issueVerificationToken(userId: string): Promise<string> {
  await prisma.verificationToken.updateMany({
    where: { userId, type: "EMAIL_VERIFICATION", usedAt: null },
    data: { usedAt: new Date() },
  });

  const { raw, hash } = generateToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hash,
      type: "EMAIL_VERIFICATION",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS.EMAIL_VERIFICATION),
    },
  });
  return raw;
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
  await prisma.verificationToken.updateMany({
    where: { userId, type: "PASSWORD_RESET", usedAt: null },
    data: { usedAt: new Date() },
  });

  const { raw, hash } = generateToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hash,
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS.PASSWORD_RESET),
    },
  });
  return raw;
}

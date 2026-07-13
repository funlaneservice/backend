import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { sendMailSafely } from "../../lib/mailer";
import { issuePasswordResetToken, issueVerificationToken } from "../../lib/verificationTokens";
import {
  exchangeCodeForIdentity,
  getGoogleAuthUrl,
  GoogleIdentity,
  isGoogleAuthConfigured,
} from "../../lib/googleAuth";
import { ApiError } from "../../utils/ApiError";
import { signToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import { hashToken } from "../../utils/verificationToken";
import { sendPasswordResetEmail, sendVerificationEmail } from "./auth.mailer";
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.schema";

function toPublicUser(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const password = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, phone: input.phone, password, role: "CLIENT" },
  });

  const rawToken = await issueVerificationToken(user.id);
  await sendMailSafely(() => sendVerificationEmail(user.email, user.name, rawToken));

  return {
    message: "Registration successful. Check your email to verify your account.",
    user: toPublicUser(user),
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await comparePassword(input.password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "This account has been suspended");
  }

  if (!user.emailVerifiedAt) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

export function googleAuthUrl() {
  if (!isGoogleAuthConfigured()) {
    throw new ApiError(503, "Google sign-in is not configured");
  }
  return getGoogleAuthUrl();
}

export async function googleAuthCallback(code: string) {
  if (!isGoogleAuthConfigured()) {
    throw new ApiError(503, "Google sign-in is not configured");
  }

  let identity: GoogleIdentity;
  try {
    identity = await exchangeCodeForIdentity(code);
  } catch {
    throw new ApiError(401, "Invalid or expired Google authorization code");
  }

  return resolveGoogleIdentity(identity);
}

async function resolveGoogleIdentity(identity: GoogleIdentity) {
  if (!identity.emailVerified) {
    throw new ApiError(400, "Google account email is not verified");
  }

  let user = await prisma.user.findUnique({ where: { googleId: identity.googleId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: identity.email } });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: identity.googleId,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        },
      });
    } else {
      const unusablePassword = await hashPassword(crypto.randomBytes(32).toString("hex"));
      user = await prisma.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          googleId: identity.googleId,
          password: unusablePassword,
          role: "CLIENT",
          emailVerifiedAt: new Date(),
        },
      });
    }
  }

  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "This account has been suspended");
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

export async function verifyEmail(input: VerifyEmailInput) {
  const tokenHash = hashToken(input.token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (
    !record ||
    record.type !== "EMAIL_VERIFICATION" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { message: "Email verified successfully. You can now log in." };
}

export async function resendVerification(input: ResendVerificationInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user && !user.emailVerifiedAt) {
    const rawToken = await issueVerificationToken(user.id);
    await sendMailSafely(() => sendVerificationEmail(user.email, user.name, rawToken));
  }

  return { message: "If that email exists and isn't verified yet, a verification link has been sent." };
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user) {
    const rawToken = await issuePasswordResetToken(user.id);
    await sendMailSafely(() => sendPasswordResetEmail(user.email, user.name, rawToken));
  }

  return { message: "If that email exists, a password reset link has been sent." };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (
    !record ||
    record.type !== "PASSWORD_RESET" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const password = await hashPassword(input.newPassword);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password, passwordChangedAt: now } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    prisma.verificationToken.updateMany({
      where: { userId: record.userId, type: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return { message: "Password reset successfully. You can now log in with your new password." };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return toPublicUser(user);
}

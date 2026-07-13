import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";
import { comparePassword, hashPassword } from "../../utils/password";
import { ChangePasswordInput, UpdateProfileInput } from "./settings.schema";

function toProfileView(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return toProfileView(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return toProfileView(user);
}

// `passwordChangedAt` is bumped here for the same reason as the forgot/reset-password
// flow (see auth.service.ts): requireAuth rejects any JWT issued before this timestamp,
// so changing the password immediately invalidates sessions on other devices.
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await comparePassword(input.currentPassword, user.password))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const password = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password, passwordChangedAt: new Date() },
  });

  return { message: "Password changed successfully. Please log in again on other devices." };
}

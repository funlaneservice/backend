import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";
import { signToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import { AdminLoginInput, BootstrapAdminInput, CreateAdminInput } from "./admin.schema";

function toPublicAdmin(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function adminLogin(input: AdminLoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await comparePassword(input.password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "This account does not have admin access");
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { admin: toPublicAdmin(user), token };
}

export async function bootstrapAdmin(input: BootstrapAdminInput) {
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
  return { admin: toPublicAdmin(user), token };
}

export async function createAdmin(input: CreateAdminInput) {
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

  return { admin: toPublicAdmin(user) };
}

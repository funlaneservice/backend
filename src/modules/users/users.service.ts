import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";
import { ChangeUserRoleInput, ListUsersQuery, UpdateUserInput } from "./users.schema";

function toAdminUserView(user: {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
  };
}

async function findUserOrThrow(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
}

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(toAdminUserView),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getUser(id: string) {
  const user = await findUserOrThrow(id);
  return toAdminUserView(user);
}

export async function updateUser(id: string, input: UpdateUserInput) {
  await findUserOrThrow(id);
  const user = await prisma.user.update({ where: { id }, data: input });
  return toAdminUserView(user);
}

export async function changeUserRole(actingAdminId: string, id: string, input: ChangeUserRoleInput) {
  if (id === actingAdminId) {
    throw new ApiError(400, "You cannot change your own role");
  }
  await findUserOrThrow(id);
  const user = await prisma.user.update({ where: { id }, data: { role: input.role } });
  return toAdminUserView(user);
}

export async function suspendUser(actingAdminId: string, id: string) {
  if (id === actingAdminId) {
    throw new ApiError(400, "You cannot suspend your own account");
  }
  const existing = await findUserOrThrow(id);
  if (existing.status === "SUSPENDED") {
    throw new ApiError(409, "User is already suspended");
  }
  const user = await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  return toAdminUserView(user);
}

export async function reactivateUser(id: string) {
  const existing = await findUserOrThrow(id);
  if (existing.status === "ACTIVE") {
    throw new ApiError(409, "User is already active");
  }
  const user = await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
  return toAdminUserView(user);
}

export async function deleteUser(actingAdminId: string, id: string) {
  if (id === actingAdminId) {
    throw new ApiError(400, "You cannot delete your own account");
  }
  await findUserOrThrow(id);
  await prisma.user.delete({ where: { id } });
}

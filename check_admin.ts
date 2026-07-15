import { prisma } from "./src/lib/prisma";
import { signToken } from "./src/utils/jwt";

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.log("no admin found");
    return;
  }
  const token = signToken({ userId: admin.id, role: admin.role });
  console.log(JSON.stringify({ id: admin.id, email: admin.email, token }));
}

main().finally(() => prisma.$disconnect());

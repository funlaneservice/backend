import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/password";

async function upsertVerifiedUser(data: {
  email: string;
  name: string;
  phone: string;
  password: string;
  role: "ADMIN" | "AGENT";
}) {
  const password = await hashPassword(data.password);
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      password,
      role: data.role,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Seeded ${data.role}: ${user.email} / ${data.password}`);
}

async function main() {
  await upsertVerifiedUser({
    email: "admin@funlane.test",
    name: "Funlane Admin",
    phone: "+2348000000001",
    password: "Admin123!",
    role: "ADMIN",
  });

  await upsertVerifiedUser({
    email: "agent@funlane.test",
    name: "Funlane Agent",
    phone: "+2348000000002",
    password: "Agent123!",
    role: "AGENT",
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

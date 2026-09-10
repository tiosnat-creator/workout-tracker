import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = ["Snatch", "Clean & Jerk", "Squat", "Pull", "Press"];

const DEFAULT_LIFTS: { name: string; category: string }[] = [
  { name: "Snatch", category: "Snatch" },
  { name: "Power Snatch", category: "Snatch" },
  { name: "Hang Snatch", category: "Snatch" },
  { name: "Clean and Jerk", category: "Clean & Jerk" },
  { name: "Power Clean", category: "Clean & Jerk" },
  { name: "Clean", category: "Clean & Jerk" },
  { name: "Jerk", category: "Clean & Jerk" },
  { name: "Back Squat", category: "Squat" },
  { name: "Front Squat", category: "Squat" },
  { name: "Overhead Squat", category: "Squat" },
  { name: "Snatch Pull", category: "Pull" },
  { name: "Clean Pull", category: "Pull" },
  { name: "Strict Press", category: "Press" },
  { name: "Push Press", category: "Press" },
];

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_USER_EMAIL and SEED_USER_PASSWORD must be set to seed the database",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: "Uncategorized" } },
    update: {},
    create: { userId: user.id, name: "Uncategorized", isUncategorized: true },
  });

  const categoryIdByName = new Map<string, string>();
  for (const name of DEFAULT_CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { userId: user.id, name },
    });
    categoryIdByName.set(name, category.id);
  }

  for (const lift of DEFAULT_LIFTS) {
    const categoryId = categoryIdByName.get(lift.category);
    if (!categoryId) continue;
    await prisma.lift.upsert({
      where: { userId_name: { userId: user.id, name: lift.name } },
      update: {},
      create: { userId: user.id, name: lift.name, categoryId },
    });
  }

  console.log(`Seeded user ${user.email} and ${DEFAULT_LIFTS.length} default lifts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

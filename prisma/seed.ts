import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, LiftCategory } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_LIFTS: { name: string; category: LiftCategory }[] = [
  { name: "Snatch", category: LiftCategory.SNATCH },
  { name: "Power Snatch", category: LiftCategory.SNATCH },
  { name: "Hang Snatch", category: LiftCategory.SNATCH },
  { name: "Clean and Jerk", category: LiftCategory.CLEAN_AND_JERK },
  { name: "Power Clean", category: LiftCategory.CLEAN_AND_JERK },
  { name: "Clean", category: LiftCategory.CLEAN_AND_JERK },
  { name: "Jerk", category: LiftCategory.CLEAN_AND_JERK },
  { name: "Back Squat", category: LiftCategory.SQUAT },
  { name: "Front Squat", category: LiftCategory.SQUAT },
  { name: "Overhead Squat", category: LiftCategory.SQUAT },
  { name: "Snatch Pull", category: LiftCategory.PULL },
  { name: "Clean Pull", category: LiftCategory.PULL },
  { name: "Strict Press", category: LiftCategory.PRESS },
  { name: "Push Press", category: LiftCategory.PRESS },
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

  for (const lift of DEFAULT_LIFTS) {
    await prisma.lift.upsert({
      where: { userId_name: { userId: user.id, name: lift.name } },
      update: {},
      create: { userId: user.id, name: lift.name, category: lift.category },
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

import "dotenv/config";
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

  if (!email) {
    throw new Error("SEED_USER_EMAIL must be set to seed the database");
  }

  // No password: there's no login to check it against anymore (access is
  // gated at the HTTP layer instead). Kept as an identifying email only.
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  // This deploy hook runs on every release. Only seed starter categories and
  // lifts the first time a user shows up (zero categories) — otherwise a
  // renamed or deleted default (e.g. "Squat" -> "Squats") would be silently
  // re-created empty on the next deploy, fighting the user's own edits.
  const existingCategoryCount = await prisma.category.count({
    where: { userId: user.id },
  });

  if (existingCategoryCount > 0) {
    console.log(`User ${user.email} already has categories — skipping default seed.`);
    return;
  }

  // All-or-nothing: if this dies partway (dropped connection, timeout), the
  // count-based guard above must still see zero categories on the next
  // deploy and retry the full seed, rather than being left half-seeded with
  // categories but no lifts and no way to repair it.
  await prisma.$transaction(async (tx) => {
    await tx.category.create({
      data: { userId: user.id, name: "Uncategorized", isUncategorized: true },
    });

    const categoryIdByName = new Map<string, string>();
    for (const name of DEFAULT_CATEGORIES) {
      const category = await tx.category.create({
        data: { userId: user.id, name },
      });
      categoryIdByName.set(name, category.id);
    }

    for (const lift of DEFAULT_LIFTS) {
      const categoryId = categoryIdByName.get(lift.category);
      if (!categoryId) continue;
      await tx.lift.create({
        data: { userId: user.id, name: lift.name, categoryId },
      });
    }
  });

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

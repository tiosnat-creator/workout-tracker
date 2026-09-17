import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { encryptEmail, hashEmail } from "../src/lib/email-crypto";

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
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!ownerEmail) {
    throw new Error("OWNER_EMAIL must be set to seed the database");
  }

  const emailHash = hashEmail(ownerEmail);
  const emailCiphertext = encryptEmail(ownerEmail);

  // Steady-state path: find the owner by the new blind-index column.
  let user = await prisma.user.findUnique({ where: { emailHash } });

  if (!user) {
    // Phase-A transition path only: the legacy plaintext `email` column
    // still exists (see prisma/schema.prisma's User model comment and the
    // add_auth_and_roles migration). If a pre-migration account matches,
    // backfill the new columns onto that SAME row rather than creating a
    // new one, so its id — and every Category/Lift/Session/etc. FK'd to
    // it — stays attached. Once a later migration drops `email`, this
    // branch stops matching anything and can be deleted.
    const legacyUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (legacyUser) {
      user = await prisma.user.update({
        where: { id: legacyUser.id },
        data: { emailHash, emailCiphertext, role: "OWNER", passwordHash: null, onboardingCompletedAt: new Date() },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: { emailHash, emailCiphertext, role: "OWNER", onboardingCompletedAt: new Date() },
    });
  } else if (user.role !== "OWNER") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "OWNER" },
    });
  }

  // Rebind to a const so TypeScript (and the transaction closure below)
  // can see this is non-null without re-checking — `user` above is `let`
  // and reassigned across several branches.
  const owner = user;

  // This deploy hook runs on every release. Only seed starter categories and
  // lifts the first time a user shows up (zero categories) — otherwise a
  // renamed or deleted default (e.g. "Squat" -> "Squats") would be silently
  // re-created empty on the next deploy, fighting the user's own edits.
  const existingCategoryCount = await prisma.category.count({
    where: { userId: owner.id },
  });

  if (existingCategoryCount > 0) {
    console.log(`Owner account already has categories — skipping default seed.`);
    return;
  }

  // All-or-nothing: if this dies partway (dropped connection, timeout), the
  // count-based guard above must still see zero categories on the next
  // deploy and retry the full seed, rather than being left half-seeded with
  // categories but no lifts and no way to repair it.
  await prisma.$transaction(async (tx) => {
    await tx.category.create({
      data: { userId: owner.id, name: "Uncategorized", isUncategorized: true },
    });

    const categoryIdByName = new Map<string, string>();
    for (const name of DEFAULT_CATEGORIES) {
      const category = await tx.category.create({
        data: { userId: owner.id, name },
      });
      categoryIdByName.set(name, category.id);
    }

    for (const lift of DEFAULT_LIFTS) {
      const categoryId = categoryIdByName.get(lift.category);
      if (!categoryId) continue;
      await tx.lift.create({
        data: { userId: owner.id, name: lift.name, categoryId },
      });
    }
  });

  console.log(`Seeded owner account and ${DEFAULT_LIFTS.length} default lifts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

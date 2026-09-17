import type { Prisma } from "@prisma/client";

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

// Called inside the caller's transaction; existing names and lift settings survive.
export async function addStarterLifts(tx: Prisma.TransactionClient, userId: string) {
  const categories = new Map<string, string>();
  for (const name of ["Uncategorized", ...DEFAULT_CATEGORIES]) {
    const category = await tx.category.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name, isUncategorized: name === "Uncategorized" },
      update: {},
    });
    categories.set(name, category.id);
  }
  for (const lift of DEFAULT_LIFTS) {
    await tx.lift.upsert({
      where: { userId_name: { userId, name: lift.name } },
      create: { userId, name: lift.name, categoryId: categories.get(lift.category)! },
      update: {},
    });
  }
}

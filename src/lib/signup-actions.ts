"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { validateSignupProfile, type ProfileState } from "@/lib/signup-profile";

export async function completeSignup(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  // A verified email session is required; never accept a user ID from the form.
  const user = await getSessionUser();
  if (!user) redirect("/signup");
  if (user.onboardingCompletedAt) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  const values = {
    username: String(formData.get("username") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    weight: String(formData.get("weight") ?? ""),
  };
  const parsed = validateSignupProfile(values);
  if (parsed.error) return { error: parsed.error, values };
  const { name, gender, weight } = parsed.data;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Only one submission can complete onboarding and create the initial weight.
    const completed = await tx.user.updateMany({
      where: { id: user.id, onboardingCompletedAt: null, disabledAt: null },
      data: { name, gender, onboardingCompletedAt: now },
    });
    if (completed.count !== 1) return;
    await tx.bodyWeightEntry.create({ data: { userId: user.id, weight, date: now } });
    await tx.category.upsert({
      where: { userId_name: { userId: user.id, name: "Uncategorized" } },
      create: { userId: user.id, name: "Uncategorized", isUncategorized: true },
      update: {},
    });
  });
  // The shared layout hides navigation until onboarding is complete. Refresh
  // that layout before redirecting so client navigation does not reuse it.
  revalidatePath("/", "layout");
  redirect("/");
}

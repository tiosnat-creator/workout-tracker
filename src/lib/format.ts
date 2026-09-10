import { LiftCategory } from "@prisma/client";

const CATEGORY_LABELS: Record<LiftCategory, string> = {
  SNATCH: "Snatch",
  CLEAN_AND_JERK: "Clean & Jerk",
  SQUAT: "Squat",
  PULL: "Pull",
  PRESS: "Press",
  ACCESSORY: "Accessory",
  OTHER: "Other",
};

export function categoryLabel(category: LiftCategory) {
  return CATEGORY_LABELS[category];
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatWeight(weight: number) {
  return `${Number(weight.toFixed(1)).toString()} kg`;
}

export type ProfileValues = { username: string; gender: string; weight: string };
export type ProfileState = { error?: string; values: ProfileValues };

export function validateSignupProfile(values: ProfileValues) {
  const name = values.username.trim();
  if (!/^[\p{L}\p{N}_.-]{3,30}$/u.test(name)) {
    return { error: "Choose a username of 3–30 letters, numbers, dots, underscores or hyphens." } as const;
  }
  if (values.gender !== "MALE" && values.gender !== "FEMALE") {
    return { error: "Choose Male or Female." } as const;
  }
  const weight = Number(values.weight);
  if (!/^\d+(\.\d)?$/.test(values.weight.trim()) || !Number.isFinite(weight) || weight <= 0 || weight > 1000) {
    return { error: "Enter a weight above 0 and up to 1,000 kg, with at most one decimal place." } as const;
  }
  return { data: { name, gender: values.gender, weight } } as const;
}

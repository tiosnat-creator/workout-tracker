"use server";

import { createHash, randomBytes } from "crypto";
import { authOrigin } from "@/lib/auth-origin";
import { admitAuthRequest } from "@/lib/auth-rate-limit";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptEmail, hashEmail } from "@/lib/email-crypto";
import { isMagicLinkEmailConfigured, sendMagicLinkEmail } from "@/lib/mail";
import {
  createUserSession,
  destroyAllSessionsForUser,
  destroySession,
  getSessionUser,
} from "@/lib/session";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Purpose is chosen by the server action, never by a hidden form field.
export async function requestMagicLink(formData: FormData) {
  return issueMagicLink(formData, "LOGIN");
}

export async function requestSignupLink(formData: FormData) {
  return issueMagicLink(formData, "SIGNUP");
}

async function issueMagicLink(formData: FormData, purpose: "LOGIN" | "SIGNUP") {
  const entryPath = purpose === "SIGNUP" ? "/signup" : "/login";
  if (!isMagicLinkEmailConfigured()) redirect(`${entryPath}?error=login-unavailable`);
  const emailInput = String(formData.get("email") ?? "").trim();

  if (emailInput.length > 254 || !EMAIL_RE.test(emailInput)) {
    redirect(`${entryPath}?error=invalid-email`);
  }

  let origin: string;
  try { origin = authOrigin(); }
  catch { redirect(`${entryPath}?error=login-unavailable`); }
  const emailHash = hashEmail(emailInput);
  if (!await admitAuthRequest(`web:${emailHash}`, 5, 3600)) {
    redirect(`${entryPath}?sent=1`);
  }
  const existing = await prisma.user.findUnique({ where: { emailHash } });
  if (existing?.disabledAt || (purpose === "LOGIN" && !existing)) {
    redirect(`${entryPath}?sent=1`);
  }

  const token = randomBytes(32).toString("base64url");

  await prisma.magicLinkToken.create({
    data: {
      purpose,
      tokenHash: hashToken(token),
      emailHash,
      emailCiphertext: encryptEmail(emailInput),
      requestIp: null,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  try {
    await sendMagicLinkEmail(emailInput, `${origin}/login/verify?token=${token}`);
  } catch {
    // Failed delivery must not leave a usable token behind.
    await prisma.magicLinkToken.deleteMany({ where: { tokenHash: hashToken(token) } });
    redirect(`${entryPath}?error=login-unavailable`);
  }

  redirect(`${entryPath}?sent=1`);
}

export async function consumeMagicLink(token: string) {
  if (!isMagicLinkEmailConfigured()) redirect("/login?error=login-unavailable");
  if (!token) redirect("/login?error=invalid-link");

  const tokenHash = hashToken(token);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    redirect("/login?error=invalid-link");
  }

  // Claim once, including under concurrent confirmation requests.
  const claimed = await prisma.magicLinkToken.updateMany({
    where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  if (claimed.count !== 1) redirect("/login?error=invalid-link");

  let user = await prisma.user.findUnique({ where: { emailHash: record.emailHash } });

  if (user?.disabledAt) {
    redirect("/login?error=account-disabled");
  }

  if (!user) {
    if (record.purpose !== "SIGNUP") redirect("/signup?error=signup-required");
    try {
      user = await prisma.user.create({
        data: {
          emailHash: record.emailHash,
          emailCiphertext: record.emailCiphertext,
          role: "MEMBER",
        },
      });
    } catch (error) {
      // A concurrent request for the same address may have created the
      // user between the findUnique above and this create.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        user = await prisma.user.findUniqueOrThrow({
          where: { emailHash: record.emailHash },
        });
      } else {
        throw error;
      }
    }
  }

  if (user.disabledAt) redirect("/login?error=account-disabled");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createUserSession(user.id);
  redirect(user.onboardingCompletedAt ? "/" : "/signup/profile");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function logoutEverywhere() {
  const user = await getSessionUser();
  if (user) {
    await destroyAllSessionsForUser(user.id);
  }
  await destroySession();
  redirect("/login");
}

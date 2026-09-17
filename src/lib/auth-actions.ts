"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
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
const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 5;
const MAX_REQUESTS_PER_IP_PER_HOUR = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function getRequestIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headerList.get("x-real-ip");
}

async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function requestMagicLink(formData: FormData) {
  if (!isMagicLinkEmailConfigured()) redirect("/login?error=login-unavailable");
  const emailInput = String(formData.get("email") ?? "").trim();

  if (!EMAIL_RE.test(emailInput)) {
    redirect("/login?error=invalid-email");
  }

  const emailHash = hashEmail(emailInput);
  const requestIp = await getRequestIp();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Light cleanup: drop this address's expired/consumed tokens so the
  // rate-limit count below reflects live requests, not accumulated
  // history, and so encrypted PII doesn't linger in dead token rows.
  await prisma.magicLinkToken.deleteMany({
    where: {
      emailHash,
      OR: [{ consumedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
    },
  });

  const [emailCount, ipCount] = await Promise.all([
    prisma.magicLinkToken.count({
      where: { emailHash, createdAt: { gte: oneHourAgo } },
    }),
    requestIp
      ? prisma.magicLinkToken.count({
          where: { requestIp, createdAt: { gte: oneHourAgo } },
        })
      : Promise.resolve(0),
  ]);

  if (
    emailCount >= MAX_REQUESTS_PER_EMAIL_PER_HOUR ||
    ipCount >= MAX_REQUESTS_PER_IP_PER_HOUR
  ) {
    // Same response as success — don't reveal rate limiting (or whether
    // the address has an account) to a potential abuser.
    redirect("/login?sent=1");
  }

  const token = randomBytes(32).toString("base64url");

  await prisma.magicLinkToken.create({
    data: {
      tokenHash: hashToken(token),
      emailHash,
      emailCiphertext: encryptEmail(emailInput),
      requestIp,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const origin = await getRequestOrigin();
  try {
    await sendMagicLinkEmail(emailInput, `${origin}/login/verify?token=${token}`);
  } catch {
    // Failed delivery must not leave a usable token behind.
    await prisma.magicLinkToken.deleteMany({ where: { tokenHash: hashToken(token) } });
    redirect("/login?error=login-unavailable");
  }

  redirect("/login?sent=1");
}

export async function consumeMagicLink(token: string) {
  if (!isMagicLinkEmailConfigured()) redirect("/login?error=login-unavailable");
  if (!token) redirect("/login?error=invalid-link");

  const tokenHash = hashToken(token);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    redirect("/login?error=invalid-link");
  }

  // Mark consumed before touching the user row — single-use regardless of
  // what happens next, so a replayed link never creates a second session.
  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  let user = await prisma.user.findUnique({ where: { emailHash: record.emailHash } });

  if (user?.disabledAt) {
    redirect("/login?error=account-disabled");
  }

  if (!user) {
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

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createUserSession(user.id);
  redirect("/");
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

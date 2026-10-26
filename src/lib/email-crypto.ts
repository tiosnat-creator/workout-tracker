// Email-at-rest protection: emailHash is an HMAC-SHA256 blind index used
// for exact-match lookups (an encrypted value with a random IV can't be
// queried by equality), and emailCiphertext is the AES-256-GCM ciphertext
// decrypted only when actually displaying an address. Two separate keys so
// a leak of one doesn't compromise the other. This protects against a
// DB-only compromise (a leaked backup, read-only SQLi) — not a compromise
// of the app server itself, since both keys live in its environment.
//
// Deliberately not `server-only`: prisma/seed.ts runs standalone via `tsx`,
// outside the Next.js server runtime, and needs these same functions to
// backfill the owner account.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function loadKey(envVar: string): Buffer {
  const raw = process.env[envVar];
  if (!raw) {
    throw new Error(`${envVar} must be set (openssl rand -base64 32)`);
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${envVar} must decode to 32 bytes (openssl rand -base64 32)`);
  }
  return key;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  const key = loadKey("EMAIL_HMAC_KEY");
  return createHmac("sha256", key).update(normalizeEmail(email)).digest("hex");
}

export function encryptEmail(email: string): string {
  const key = loadKey("EMAIL_ENCRYPTION_KEY");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(normalizeEmail(email), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64")).join(":");
}

export function decryptEmail(stored: string): string {
  const key = loadKey("EMAIL_ENCRYPTION_KEY");
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed email ciphertext");
  }

  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  // decipher.final() throws if the auth tag doesn't verify — never swallow
  // that, it's the whole point of using GCM over a non-authenticated mode.
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

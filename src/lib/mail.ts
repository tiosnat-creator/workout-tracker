import "server-only";
import { Resend } from "resend";

// Fail closed in every environment. Login bearer tokens must never be logged.
export function isMagicLinkEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
  );
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new Error("Email sign-in is temporarily unavailable.");
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Sign in to Lifting Log",
      text: `Sign in to Lifting Log: ${url}\n\nThis link expires in 15 minutes and can only be used once. If you didn't request this, you can ignore this email.`,
      html: `<p>Click the link below to sign in to Lifting Log.</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes and can only be used once. If you didn't request this, you can ignore this email.</p>`,
    });

    if (error) throw new Error("Email delivery failed");
  } catch {
    // Provider errors may contain request details; never propagate bearer URLs.
    throw new Error("Email sign-in is temporarily unavailable.");
  }
}

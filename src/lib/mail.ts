import "server-only";
import { Resend } from "resend";

// If RESEND_API_KEY is unset, log the link instead of sending. This is the
// local-dev path — RESEND_API_KEY should be set on the production
// environment only, not on PR previews, so testing the auth flow on a
// preview never sends real email to whatever address a tester types in.
export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[mail] RESEND_API_KEY not set — magic link for ${email}: ${url}`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL must be set when RESEND_API_KEY is set");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Sign in to Lifting Log",
    text: `Sign in to Lifting Log: ${url}\n\nThis link expires in 15 minutes and can only be used once. If you didn't request this, you can ignore this email.`,
    html: `<p>Click the link below to sign in to Lifting Log.</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes and can only be used once. If you didn't request this, you can ignore this email.</p>`,
  });

  if (error) {
    throw new Error(`Failed to send magic link email: ${error.message}`);
  }
}

// Email helper. Uses Resend when RESEND_API_KEY is present, otherwise logs
// the message to the server console so dev / pre-prod still flows.

import { Resend } from "resend";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  /** Plain text body. We build HTML from the same content (<pre>-style wrapping). */
  text: string;
  /** Optional richer HTML body. If omitted we wrap `text`. */
  html?: string;
};

let _client: Resend | null = null;

function client(): Resend | null {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _client = new Resend(key);
  return _client;
}

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM ?? "LuxLane <no-reply@luxlane.app>";

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const c = client();
  const html = msg.html ?? `<pre style="font-family:inherit">${escapeHtml(msg.text)}</pre>`;
  if (!c) {
    console.log(
      `[email] (no RESEND_API_KEY, would send)\n  to: ${msg.to}\n  subject: ${msg.subject}\n  body:\n${msg.text}\n`,
    );
    return;
  }
  try {
    await c.emails.send({ from: FROM, to: msg.to, subject: msg.subject, text: msg.text, html });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

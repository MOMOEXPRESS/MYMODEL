import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 8-char, uppercase, no ambiguous chars. Human-friendly agency signup code. */
export function generateSignupCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Display name for a model — stage name when set, otherwise legal name.
 * Use anywhere the model is shown publicly (Board, roster, comp card).
 * Legal name (User.displayName) is reserved for contracts / invoices.
 */
export function modelDisplay(m: {
  stageName?: string | null;
  user?: { displayName: string } | null;
}): string {
  return m.stageName?.trim() || m.user?.displayName || "";
}

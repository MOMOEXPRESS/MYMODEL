// POST /api/locale { locale: "en" | "fr" } — stores the user's UI language
// in a cookie. Read synchronously anywhere by getLocale().

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const locale = body?.locale;
  if (locale !== "en" && locale !== "fr") {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true, locale });
}

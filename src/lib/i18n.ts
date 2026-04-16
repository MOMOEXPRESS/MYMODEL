// Tiny i18n — cookie-based locale, server-side dictionary lookup.
//
// Usage:
//   const t = await getT();  // in a server component
//   t("nav.roster");         // → "Roster" (en) or "Roster" (fr — kept English)
//
// We ship EN fully and FR as a cumulative overlay: any key missing from
// FR falls back to EN. That way a partial translation is never broken —
// the untranslated strings appear in English instead of as key-names.

import { cookies } from "next/headers";

export type Locale = "en" | "fr";

export const LOCALE_COOKIE = "ll_locale";

const en = {
  "nav.roster": "Roster",
  "nav.board": "Board",
  "nav.jobs": "Jobs",
  "nav.messages": "Messages",
  "nav.broadcasts": "Broadcasts",
  "nav.invoices": "Invoices",
  "nav.payouts": "Payouts",
  "nav.contracts": "Contracts",
  "nav.compliance": "Compliance",
  "nav.scouting": "Scouting",
  "nav.analytics": "Analytics",
  "nav.activity": "Activity",
  "nav.trash": "Trash",
  "nav.billing": "Billing",
  "nav.settings": "Settings",
  "nav.agency": "Agency",
  "nav.code": "Code",
  "nav.signout": "Sign out",
  "landing.cta.start": "Start your agency",
  "landing.cta.login": "Log in",
  "landing.eyebrow": "The agency OS for modeling",
  "landing.headline": "Run your roster, board and bookings in one place.",
  "landing.sub":
    "LuxLane replaces the patchwork of spreadsheets, WhatsApp and Dropbox that boutique agencies run on. Manage every model, every hold, every job — without switching tabs.",
  "landing.footer.tagline": "Built for Paris. Working for everyone.",
  "auth.login.title": "Log in",
  "auth.login.sub":
    "Welcome back. Bookers, production and models all use the same sign-in.",
  "auth.login.email": "Email",
  "auth.login.password": "Password",
  "auth.login.submit": "Sign in",
  "auth.login.forgot": "Forgot your password?",
  "auth.login.new_agency": "New agency?",
  "auth.login.signup_link": "Create an account",
  "auth.login.signed_model": "Signed model?",
  "auth.login.join_link": "Join with your agency code",
  "common.back": "Back",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.saving": "Saving…",
  "common.saved": "Saved.",
} as const;

type Key = keyof typeof en;

const fr: Partial<Record<Key, string>> = {
  "nav.roster": "Roster",
  "nav.board": "Board",
  "nav.jobs": "Jobs",
  "nav.messages": "Messages",
  "nav.broadcasts": "Diffusions",
  "nav.invoices": "Factures",
  "nav.payouts": "Paiements",
  "nav.contracts": "Contrats",
  "nav.compliance": "Conformité",
  "nav.scouting": "Scouting",
  "nav.analytics": "Statistiques",
  "nav.activity": "Activité",
  "nav.trash": "Corbeille",
  "nav.billing": "Abonnement",
  "nav.settings": "Paramètres",
  "nav.agency": "Agence",
  "nav.code": "Code",
  "nav.signout": "Déconnexion",
  "landing.cta.start": "Créer votre agence",
  "landing.cta.login": "Se connecter",
  "landing.eyebrow": "L'OS d'agence pour le mannequinat",
  "landing.headline": "Gérez votre roster, board et bookings depuis un seul endroit.",
  "landing.sub":
    "LuxLane remplace le patchwork Excel, WhatsApp et Dropbox sur lequel tournent les agences boutique. Chaque modèle, chaque option, chaque job — sans changer d'onglet.",
  "landing.footer.tagline": "Conçu à Paris. Pensé pour tous.",
  "auth.login.title": "Se connecter",
  "auth.login.sub":
    "Re-bienvenue. Bookers, production et modèles utilisent la même connexion.",
  "auth.login.email": "Email",
  "auth.login.password": "Mot de passe",
  "auth.login.submit": "Se connecter",
  "auth.login.forgot": "Mot de passe oublié ?",
  "auth.login.new_agency": "Nouvelle agence ?",
  "auth.login.signup_link": "Créer un compte",
  "auth.login.signed_model": "Modèle signé ?",
  "auth.login.join_link": "Rejoindre avec votre code d'agence",
  "common.back": "Retour",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.saving": "Enregistrement…",
  "common.saved": "Enregistré.",
};

const dicts: Record<Locale, Partial<Record<Key, string>>> = { en, fr };

export async function getLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    const v = jar.get(LOCALE_COOKIE)?.value as Locale | undefined;
    if (v === "fr" || v === "en") return v;
  } catch {
    /* outside request */
  }
  return "en";
}

/** Server-side translator. */
export async function getT(): Promise<(key: Key) => string> {
  const locale = await getLocale();
  const dict = dicts[locale];
  return (key) => dict[key] ?? en[key];
}

/** Sync translator given an already-resolved locale — for client components. */
export function translator(locale: Locale): (key: Key) => string {
  const dict = dicts[locale];
  return (key) => dict[key] ?? en[key];
}

export type TranslationKey = Key;

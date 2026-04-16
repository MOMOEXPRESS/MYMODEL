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
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.add": "Add",
  "common.search": "Search",
  "common.loading": "Loading",
  "common.signout": "Sign out",
  "common.notifications": "Notifications",
  "common.export": "Export",
  "common.download": "Download",
  "common.upload": "Upload",
  "common.confirm": "Confirm",
  "common.no_results": "No results",
  "home.greeting.morning": "Good morning",
  "home.greeting.afternoon": "Good afternoon",
  "home.greeting.evening": "Good evening",
  "home.greeting.late": "Late night",
  "home.recent_activity": "Recent activity",
  "home.upcoming": "Upcoming this week",
  "home.at_risk": "At risk",
  "home.recently_confirmed": "Recently confirmed",
  "home.bookings_pulse": "Bookings pulse",
  "home.quick_links": "Quick links",
  "home.kpi.models": "Models",
  "home.kpi.open_jobs": "Open jobs",
  "home.kpi.overdue": "Overdue",
  "home.kpi.expiring_docs": "Expiring docs",
  "home.action.new_job": "New job",
  "home.action.broadcast": "Broadcast",
  "jobs.title": "Jobs",
  "jobs.new": "New job",
  "jobs.empty.title": "No jobs yet",
  "jobs.empty.body": "Create your first job to start attaching models, sending options, and filling the Board.",
  "jobs.col.job": "Job",
  "jobs.col.type": "Type",
  "jobs.col.dates": "Dates",
  "jobs.col.status": "Status",
  "jobs.col.models": "Models",
  "board.title": "Board",
  "board.today": "Today",
  "board.find_a_model": "Find a model",
  "settings.title": "Settings",
  "settings.profile": "Agency profile",
  "settings.team": "Team",
  "settings.billing_details": "Billing details (for invoices)",
  "settings.privacy": "Privacy & data",
  "invoices.title": "Invoices",
  "invoices.new": "New invoice",
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
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.add": "Ajouter",
  "common.search": "Rechercher",
  "common.loading": "Chargement",
  "common.signout": "Déconnexion",
  "common.notifications": "Notifications",
  "common.export": "Exporter",
  "common.download": "Télécharger",
  "common.upload": "Téléverser",
  "common.confirm": "Confirmer",
  "common.no_results": "Aucun résultat",
  "home.greeting.morning": "Bonjour",
  "home.greeting.afternoon": "Bon après-midi",
  "home.greeting.evening": "Bonsoir",
  "home.greeting.late": "Bonne nuit",
  "home.recent_activity": "Activité récente",
  "home.upcoming": "À venir cette semaine",
  "home.at_risk": "À risque",
  "home.recently_confirmed": "Confirmés récemment",
  "home.bookings_pulse": "Pouls des bookings",
  "home.quick_links": "Liens rapides",
  "home.kpi.models": "Modèles",
  "home.kpi.open_jobs": "Jobs ouverts",
  "home.kpi.overdue": "En retard",
  "home.kpi.expiring_docs": "Docs à renouveler",
  "home.action.new_job": "Nouveau job",
  "home.action.broadcast": "Diffusion",
  "jobs.title": "Jobs",
  "jobs.new": "Nouveau job",
  "jobs.empty.title": "Pas encore de jobs",
  "jobs.empty.body": "Créez votre premier job pour attacher des modèles, envoyer des options et remplir le Board.",
  "jobs.col.job": "Job",
  "jobs.col.type": "Type",
  "jobs.col.dates": "Dates",
  "jobs.col.status": "Statut",
  "jobs.col.models": "Modèles",
  "board.title": "Board",
  "board.today": "Aujourd'hui",
  "board.find_a_model": "Trouver un modèle",
  "settings.title": "Paramètres",
  "settings.profile": "Profil de l'agence",
  "settings.team": "Équipe",
  "settings.billing_details": "Coordonnées de facturation",
  "settings.privacy": "Confidentialité & données",
  "invoices.title": "Factures",
  "invoices.new": "Nouvelle facture",
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

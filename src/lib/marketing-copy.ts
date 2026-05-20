import type { Locale } from "@/lib/i18n";
import type { MarketingCopy } from "@/components/marketing/marketing-page";

const en: MarketingCopy = {
  headline: "The runway behind",
  headlineAccent: "the runway.",
  sub: "LuxLane is where agencies, models, clients, and creatives stay in sync — holds, confirmations, castings, and the network around them.",
  ctaStart: "Open a workspace",
  ctaLogin: "Sign in",
  signIn: "Sign in",
  stories: [
    {
      time: "07:30",
      title: "Workbench lights up",
      body: "The booker sees who needs a reply, which hold is about to expire, and which client package was opened overnight.",
      accent: "#e8a4b8",
    },
    {
      time: "11:00",
      title: "Holds spread across the board",
      body: "Amber cells mean possibility — 1st, 2nd, 3rd — without drowning anyone in jargon. Models feel it on their phone the same second.",
      accent: "#fbbf24",
    },
    {
      time: "15:30",
      title: "Confirmed. Room opens.",
      body: "Green locks the day. Production gets travel and call times; the client portal updates; the job room is live.",
      accent: "#4ade80",
    },
    {
      time: "20:00",
      title: "Network after hours",
      body: "Creatives post a group event, members apply, connections grow — the same people, one thread, not five apps.",
      accent: "#9b8cff",
    },
  ],
  roles: [
    { slug: "agency", label: "Agency", tagline: "Book & run", href: "/signup/agency", hue: "#e8a4b8" },
    { slug: "model", label: "Model", tagline: "Join roster", href: "/signup/model", hue: "#d4a574" },
    { slug: "client", label: "Client", tagline: "Brief talent", href: "/signup/client", hue: "#9b8cff" },
    { slug: "creative", label: "Creative", tagline: "Shoot & hire", href: "/signup/creative", hue: "#4ade80" },
    { slug: "member", label: "Member", tagline: "Connect", href: "/signup/member", hue: "#60a5fa" },
  ],
};

const fr: MarketingCopy = {
  headline: "Les coulisses de",
  headlineAccent: "la scène.",
  sub: "LuxLane aligne agences, mannequins, clients et créatifs — options, confirmations, castings et le réseau autour.",
  ctaStart: "Ouvrir un espace",
  ctaLogin: "Se connecter",
  signIn: "Se connecter",
  stories: [
    {
      time: "07:30",
      title: "Le workbench s'allume",
      body: "Le booker voit qui doit répondre, quelle option expire, quel package client a été ouvert cette nuit.",
      accent: "#e8a4b8",
    },
    {
      time: "11:00",
      title: "Les options sur le board",
      body: "Les cellules ambrées signifient la possibilité — 1ère, 2ème, 3ème — sans jargon. Les mannequins voient la même chose sur leur téléphone.",
      accent: "#fbbf24",
    },
    {
      time: "15:30",
      title: "Confirmé. La room s'ouvre.",
      body: "Le vert verrouille la journée. La production a les horaires ; le portail client se met à jour ; la job room est live.",
      accent: "#4ade80",
    },
    {
      time: "20:00",
      title: "Le réseau après le set",
      body: "Un créatif poste un événement, les membres postulent, les connexions grandissent — les mêmes personnes, un fil.",
      accent: "#9b8cff",
    },
  ],
  roles: [
    { slug: "agency", label: "Agence", tagline: "Booker", href: "/signup/agency", hue: "#e8a4b8" },
    { slug: "model", label: "Mannequin", tagline: "Rejoindre", href: "/signup/model", hue: "#d4a574" },
    { slug: "client", label: "Client", tagline: "Briefs", href: "/signup/client", hue: "#9b8cff" },
    { slug: "creative", label: "Créatif", tagline: "Tournages", href: "/signup/creative", hue: "#4ade80" },
    { slug: "member", label: "Membre", tagline: "Réseau", href: "/signup/member", hue: "#60a5fa" },
  ],
};

export function getMarketingCopy(locale: Locale): MarketingCopy {
  return locale === "fr" ? fr : en;
}

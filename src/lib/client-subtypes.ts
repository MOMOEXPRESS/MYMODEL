import type { ClientSubtype } from "@prisma/client";

export const CLIENT_SUBTYPE_LABEL: Record<ClientSubtype, string> = {
  BRAND: "Brand / advertiser",
  MEDIA_AGENCY: "Media / creative agency",
  PRODUCTION: "Production company",
  MAGAZINE: "Magazine / publisher",
  ECOMMERCE: "E-commerce / retailer",
  CASTING_DIRECTOR: "Casting director",
  PHOTOGRAPHER: "Photographer",
  DESIGNER: "Designer / label",
  PR_EVENTS: "PR / events",
  TV_FILM: "TV / film",
  OTHER: "Other",
};

export const CLIENT_SUBTYPE_OPTIONS = Object.entries(CLIENT_SUBTYPE_LABEL).map(
  ([value, label]) => ({ value: value as ClientSubtype, label }),
);

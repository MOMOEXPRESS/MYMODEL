// Shared shape for the comp card renderers. Kept tiny — whatever the PDF
// route needs, the HTML preview needs, the PNG route needs.

export type CompCardTemplate = "CLASSIC" | "EDITORIAL" | "GRID";

export type CompCardData = {
  // agency
  agencyName: string;
  agencyLogoUrl?: string | null;
  agencyCity?: string | null;

  // model
  modelName: string;
  division: string;
  measurements: {
    heightCm?: number | null;
    bustCm?: number | null;
    waistCm?: number | null;
    hipsCm?: number | null;
    shoeEu?: number | null;
    dressEu?: number | null;
    suitEu?: number | null;
    inseamCm?: number | null;
    hair?: string | null;
    eyes?: string | null;
  };

  // images — URLs the renderer can fetch.
  // The first image is the hero; the rest are thumbnails. 1–6 images total.
  imageUrls: string[];

  template: CompCardTemplate;
};

/**
 * Human-friendly stat lines for a comp card.
 * "Height 178 cm · Bust 84 · Waist 60 · …" — only the present values, in a
 * consistent agency-friendly order, with imperial equivalents as a suffix.
 */
export function statLines(m: CompCardData["measurements"]): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value != null && value !== "") out.push({ label, value });
  };
  if (typeof m.heightCm === "number") {
    const ft = Math.floor(m.heightCm / 30.48);
    const inches = Math.round((m.heightCm / 2.54) - ft * 12);
    push("Height", `${m.heightCm} cm · ${ft}'${inches}"`);
  }
  push("Bust", num(m.bustCm, "cm"));
  push("Waist", num(m.waistCm, "cm"));
  push("Hips", num(m.hipsCm, "cm"));
  push("Dress", num(m.dressEu, "EU"));
  push("Shoe", num(m.shoeEu, "EU"));
  push("Suit", num(m.suitEu, "EU"));
  push("Inseam", num(m.inseamCm, "cm"));
  push("Hair", m.hair ?? undefined);
  push("Eyes", m.eyes ?? undefined);
  return out;
}

function num(n: number | null | undefined, unit: string): string | null {
  if (typeof n !== "number") return null;
  return `${n} ${unit}`;
}

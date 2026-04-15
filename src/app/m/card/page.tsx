import { prisma } from "@/lib/db";
import { requireModel } from "@/lib/auth-guards";

export default async function MyCardPage() {
  const user = await requireModel();
  const model = await prisma.model.findUnique({
    where: { userId: user.id },
  });

  const measurements = (model?.measurements ?? {}) as Record<string, unknown>;

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">My card</h1>
      <p className="mt-2 text-sm text-ink-muted">Your stats, portfolio and documents.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="ll-card p-6">
          <h2 className="font-medium">Stats</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Division" value={model?.division.replace("_", " ") ?? "—"} />
            <Row label="Height" value={fmt(measurements.heightCm, "cm")} />
            <Row label="Bust" value={fmt(measurements.bustCm, "cm")} />
            <Row label="Waist" value={fmt(measurements.waistCm, "cm")} />
            <Row label="Hips" value={fmt(measurements.hipsCm, "cm")} />
            <Row label="Shoe" value={fmt(measurements.shoeEu, "eu")} />
            <Row label="Hair" value={(measurements.hair as string) ?? "—"} />
            <Row label="Eyes" value={(measurements.eyes as string) ?? "—"} />
          </dl>
        </section>

        <section className="ll-card p-6">
          <h2 className="font-medium">Portfolio</h2>
          <p className="mt-4 text-sm text-ink-muted">
            Photo uploads come in Sprint 1. Your agency will be able to add polaroids,
            book shots and video reel here.
          </p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function fmt(value: unknown, unit: string): string {
  if (typeof value !== "number") return "—";
  return `${value} ${unit}`;
}

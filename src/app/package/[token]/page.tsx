import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { recordPackageView } from "@/lib/packages";
import { modelDisplay } from "@/lib/utils";
import { statLines } from "@/lib/compcard";
import { PackageGate } from "./package-gate";
import { AppLogo } from "@/components/app-logo";

const UNLOCK_COOKIE = "ll_pkg_unlock";

export default async function PublicPackagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pkg = await prisma.talentPackage.findUnique({
    where: { token },
    include: {
      agency: { select: { name: true, logoUrl: true, city: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          model: {
            include: {
              user: { select: { displayName: true } },
              portfolio: {
                where: { kind: "BOOK" },
                orderBy: { order: "asc" },
                take: 6,
              },
            },
          },
        },
      },
    },
  });

  if (!pkg || (pkg.expiresAt && pkg.expiresAt < new Date())) notFound();
  if (pkg.token.startsWith("revoked-")) notFound();

  const jar = await cookies();
  const unlocked = !pkg.passwordHash || jar.get(`${UNLOCK_COOKIE}_${token}`)?.value === "1";

  if (unlocked) {
    const h = await headers();
    const hint = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    await recordPackageView(pkg.id, hint.slice(0, 64));
  }

  const body = (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-paper-border bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <AppLogo href="/" showWordmark />
          <span className="text-xs text-ink-subtle">{pkg.agency.name}</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="ll-badge mb-4">Talent package</p>
        <h1 className="text-3xl font-semibold tracking-tight">{pkg.title}</h1>
        {pkg.note ? (
          <p className="mt-3 text-sm text-ink-muted max-w-2xl leading-relaxed">{pkg.note}</p>
        ) : null}

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          {pkg.items.map(({ model }) => {
            const hero = model.portfolio[0]?.url;
            const stats = statLines(
              (model.measurements as Parameters<typeof statLines>[0]) ?? {},
            );
            return (
              <article key={model.userId} className="ll-card overflow-hidden">
                {hero ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero} alt="" className="w-full aspect-[3/4] object-cover" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-paper-muted flex items-center justify-center text-ink-subtle text-sm">
                    No photos yet
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-lg font-semibold">{modelDisplay(model)}</h2>
                  {stats.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                      {stats.map((s) => (
                        <li key={s.label}>
                          {s.label}: {s.value}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );

  if (!unlocked) {
    return <PackageGate token={token} agencyName={pkg.agency.name} title={pkg.title} />;
  }

  return body;
}

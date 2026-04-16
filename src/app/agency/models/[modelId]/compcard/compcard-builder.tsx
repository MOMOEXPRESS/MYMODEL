"use client";

import { PortfolioKind } from "@prisma/client";
import { Check, Download, Image as ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

type Photo = { id: string; url: string; kind: PortfolioKind };

const MAX_PICKS = 5;

export function CompCardBuilder({
  modelId,
  modelName,
  division,
  agencyName,
  agencyCity,
  agencyLogoUrl,
  portfolio,
  stats,
}: {
  modelId: string;
  modelName: string;
  division: string;
  agencyName: string;
  agencyCity: string | null;
  agencyLogoUrl: string | null;
  portfolio: Photo[];
  stats: { label: string; value: string }[];
}) {
  const [picks, setPicks] = useState<string[]>(() =>
    portfolio.slice(0, MAX_PICKS).map((p) => p.id),
  );
  const [template, setTemplate] = useState<"CLASSIC" | "EDITORIAL">("CLASSIC");

  function togglePick(id: string) {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PICKS) {
        // replace the oldest pick
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }

  const picked: Photo[] = useMemo(
    () =>
      picks
        .map((id) => portfolio.find((p) => p.id === id))
        .filter((p): p is Photo => Boolean(p)),
    [picks, portfolio],
  );
  const [hero, ...thumbs] = picked;

  const query = new URLSearchParams();
  if (picks.length > 0) query.set("imageIds", picks.join(","));
  query.set("template", template);

  const pdfUrl = `/api/compcard/${modelId}/pdf?${query.toString()}`;
  const pngUrl = `/api/compcard/${modelId}/png?${query.toString()}`;

  return (
    <div>
      <PageHeader
        title="Comp card"
        subtitle={`Pick up to ${MAX_PICKS} photos, then download. The first pick is the hero.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-paper-border overflow-hidden">
              {(["CLASSIC", "EDITORIAL"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={
                    template === t
                      ? "px-3 py-1.5 text-xs bg-ink text-paper"
                      : "px-3 py-1.5 text-xs bg-paper-elevated hover:bg-paper"
                  }
                >
                  {t === "CLASSIC" ? "Classic" : "Editorial"}
                </button>
              ))}
            </div>
            <a href={pdfUrl} className="ll-btn-primary" target="_blank" rel="noreferrer">
              <Download size={14} /> PDF
            </a>
            <a href={pngUrl} className="ll-btn-secondary" target="_blank" rel="noreferrer">
              <Download size={14} /> PNG
            </a>
          </div>
        }
      />

      {portfolio.length === 0 ? (
        <div className="px-8 py-8">
          <EmptyState
            icon={<ImageIcon size={20} />}
            title="No photos on the book"
            body="Upload photos on the model's page to generate a comp card."
          />
        </div>
      ) : (
        <div className="px-8 py-8 grid gap-8 lg:grid-cols-2">
          {/* Picker */}
          <section className="ll-card p-5">
            <h2 className="font-medium">Photos</h2>
            <p className="text-xs text-ink-subtle mt-0.5">
              {picks.length} / {MAX_PICKS} picked — click to toggle, first pick is hero.
            </p>
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {portfolio.map((p) => {
                const index = picks.indexOf(p.id);
                const isHero = index === 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePick(p.id)}
                    className={cn(
                      "relative aspect-[3/4] overflow-hidden rounded-lg border transition-all",
                      index >= 0
                        ? isHero
                          ? "border-accent ring-2 ring-accent/40"
                          : "border-ink"
                        : "border-paper-border hover:border-ink-subtle",
                    )}
                    title={isHero ? "Hero photo" : p.kind.toLowerCase()}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    {index >= 0 && (
                      <span
                        className={cn(
                          "absolute top-1.5 left-1.5 w-5 h-5 rounded-full text-[10px] font-medium flex items-center justify-center",
                          isHero ? "bg-accent text-white" : "bg-ink text-paper",
                        )}
                      >
                        {isHero ? <Check size={12} /> : index + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Preview */}
          <section className="ll-card p-5 lg:sticky lg:top-6">
            <h2 className="font-medium">Preview · Classic</h2>
            <p className="text-xs text-ink-subtle mt-0.5">
              A rough preview — the exported PDF is higher fidelity.
            </p>

            <div className="mt-4 aspect-[1/1.414] rounded-lg border border-paper-border bg-paper p-4 flex flex-col">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-ink-subtle">
                    {agencyName}
                  </div>
                  <div className="font-serif text-lg leading-tight mt-0.5">{modelName}</div>
                  <div className="text-[9px] uppercase tracking-widest text-ink-subtle mt-0.5">
                    {division.replace("_", " ")}
                  </div>
                </div>
                {agencyLogoUrl ? (
                  <div className="w-10 h-10 rounded bg-paper-elevated border border-paper-border overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={agencyLogoUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-[9px] uppercase tracking-widest text-ink-subtle">
                    {agencyCity ?? ""}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-3 flex-1 min-h-0">
                <div className="flex-1 rounded bg-paper-elevated overflow-hidden">
                  {hero ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={hero.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] uppercase tracking-widest text-ink-subtle">
                      No photo
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                  <div className="grid grid-cols-2 gap-1.5">
                    {thumbs.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        className="aspect-[3/4] rounded bg-paper-elevated overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - thumbs.length) }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] rounded bg-paper-elevated/50 border border-dashed border-paper-border"
                      />
                    ))}
                  </div>
                  <div className="mt-auto pt-2 border-t border-paper-border">
                    <dl className="text-[9px] space-y-0.5">
                      {stats.slice(0, 7).map((s) => (
                        <div key={s.label} className="flex justify-between">
                          <dt className="uppercase tracking-widest text-ink-subtle">
                            {s.label}
                          </dt>
                          <dd>{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 text-[7.5px] text-ink-subtle text-right">
                {agencyName}
                {agencyCity ? ` · ${agencyCity}` : ""} · luxlane.app
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

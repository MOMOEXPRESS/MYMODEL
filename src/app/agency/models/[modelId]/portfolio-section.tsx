"use client";

import { PortfolioImage, PortfolioKind } from "@prisma/client";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { deletePortfolioImage, uploadPortfolioImage } from "./actions";

const TABS: { kind: PortfolioKind; label: string }[] = [
  { kind: "BOOK", label: "Book" },
  { kind: "POLAROID", label: "Polaroids" },
  { kind: "VIDEO", label: "Video" },
];

export function PortfolioSection({
  modelId,
  portfolio,
}: {
  modelId: string;
  portfolio: PortfolioImage[];
}) {
  const [active, setActive] = useState<PortfolioKind>("BOOK");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = portfolio.filter((p) => p.kind === active);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("modelId", modelId);
      fd.set("kind", active);
      fd.set("file", file);
      // Upload serially so the order matches what the user dropped.
      const res = await uploadPortfolioImage(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    }
  }

  return (
    <section className="ll-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Portfolio</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 text-xs">
            {TABS.map((t) => (
              <button
                key={t.kind}
                onClick={() => setActive(t.kind)}
                className={
                  active === t.kind
                    ? "px-2.5 py-1 rounded-md bg-ink text-paper"
                    : "px-2.5 py-1 rounded-md text-ink-muted hover:text-ink"
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="ll-btn-secondary text-xs"
          >
            <Plus size={14} /> Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={active === "VIDEO" ? "video/*" : "image/*"}
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              startTransition(() => onFiles(files));
            }}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <div className="mt-5 border border-dashed border-paper-border rounded-lg p-10 flex flex-col items-center text-center">
          <ImageIcon size={18} className="text-ink-subtle" />
          <p className="mt-2 text-sm text-ink-muted">
            No {TABS.find((t) => t.kind === active)!.label.toLowerCase()} yet. Upload images to build the portfolio.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((img) => (
            <PortfolioCard key={img.id} img={img} />
          ))}
        </div>
      )}

      {pending && <p className="mt-3 text-xs text-ink-subtle">Uploading…</p>}
    </section>
  );
}

function PortfolioCard({ img }: { img: PortfolioImage }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="relative group aspect-[3/4] overflow-hidden rounded-lg bg-paper border border-paper-border">
      {img.kind === "VIDEO" ? (
        <video src={img.url} className="w-full h-full object-cover" muted playsInline />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt={img.caption ?? ""} className="w-full h-full object-cover" />
      )}
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set("imageId", img.id);
            await deletePortfolioImage(fd);
          })
        }
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          type="submit"
          disabled={pending}
          className="w-7 h-7 rounded-md bg-paper-elevated/90 border border-paper-border flex items-center justify-center text-ink hover:bg-red-50 hover:text-red-600"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </form>
    </div>
  );
}

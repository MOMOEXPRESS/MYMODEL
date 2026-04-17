"use client";

import { Division, ModelStatus } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

const DIVISIONS: { value: Division; label: string }[] = [
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "CURVE", label: "Curve" },
  { value: "KIDS", label: "Kids" },
  { value: "TALENTS", label: "Talents" },
  { value: "NEW_FACES", label: "New faces" },
];

const STATUSES: { value: ModelStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "INACTIVE", label: "Inactive" },
];

export function RosterFilters({
  defaultQ,
  division,
  status,
  city,
  cities,
}: {
  defaultQ: string;
  division?: Division;
  status?: ModelStatus;
  city?: string;
  cities: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(defaultQ);
  const [, startTransition] = useTransition();

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (!v) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?");
      });
    },
    [router, sp],
  );

  // Debounce the search input so we don't spam the server.
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== defaultQ) update({ q: q || undefined });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Boolean(q || division || status || city);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search models by name or email"
          className="ll-input pl-9"
        />
      </div>

      <Select
        value={division ?? ""}
        onChange={(v) => update({ division: v || undefined })}
        placeholder="All divisions"
        options={DIVISIONS}
      />

      <Select
        value={status ?? ""}
        onChange={(v) => update({ status: v || undefined })}
        placeholder="All statuses"
        options={STATUSES}
      />

      {cities.length > 1 && (
        <Select
          value={city ?? ""}
          onChange={(v) => update({ city: v || undefined })}
          placeholder="All cities"
          options={cities.map((c) => ({ value: c, label: c }))}
        />
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace("?"));
          }}
          className="ll-btn-ghost text-xs"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="ll-input w-auto"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

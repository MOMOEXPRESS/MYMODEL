"use client";

import { Division, ModelStatus } from "@prisma/client";
import { useState, useTransition } from "react";
import { saveMeasurements } from "./actions";

type Model = {
  division: Division;
  status: ModelStatus;
  commissionPercent: number | null;
  exclusions: string[];
  measurements: Record<string, unknown>;
};

export function MeasurementsForm({ modelId, model }: { modelId: string; model: Model }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("modelId", modelId);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveMeasurements(fd);
      if (!res.ok) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const m = model.measurements;
  const n = (k: string): number | "" =>
    typeof m[k] === "number" ? (m[k] as number) : "";
  const s = (k: string): string => (typeof m[k] === "string" ? (m[k] as string) : "");

  return (
    <form onSubmit={onSubmit} className="ll-card p-5 space-y-4 lg:sticky lg:top-6">
      <h2 className="font-medium">Card</h2>

      <div>
        <label className="ll-label">Division</label>
        <select name="division" defaultValue={model.division} className="ll-input">
          <option value="WOMEN">Women</option>
          <option value="MEN">Men</option>
          <option value="CURVE">Curve</option>
          <option value="KIDS">Kids</option>
          <option value="TALENTS">Talents</option>
          <option value="NEW_FACES">New faces</option>
        </select>
      </div>

      <div>
        <label className="ll-label">Status</label>
        <select name="status" defaultValue={model.status} className="ll-input">
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On leave</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div>
        <label className="ll-label">Commission % <span className="text-ink-subtle normal-case">(blank = agency default)</span></label>
        <input
          type="number"
          name="commissionPercent"
          defaultValue={model.commissionPercent ?? ""}
          min={0}
          max={100}
          step="0.1"
          className="ll-input"
        />
      </div>

      <hr className="border-paper-border" />

      <div className="grid grid-cols-2 gap-3">
        <Field name="heightCm" label="Height (cm)" defaultValue={n("heightCm")} />
        <Field name="inseamCm" label="Inseam (cm)" defaultValue={n("inseamCm")} />
        <Field name="bustCm" label="Bust (cm)" defaultValue={n("bustCm")} />
        <Field name="waistCm" label="Waist (cm)" defaultValue={n("waistCm")} />
        <Field name="hipsCm" label="Hips (cm)" defaultValue={n("hipsCm")} />
        <Field name="shoeEu" label="Shoe (EU)" defaultValue={n("shoeEu")} />
        <Field name="dressEu" label="Dress (EU)" defaultValue={n("dressEu")} />
        <Field name="suitEu" label="Suit (EU)" defaultValue={n("suitEu")} />
        <div className="col-span-1">
          <label className="ll-label">Hair</label>
          <input name="hair" defaultValue={s("hair")} className="ll-input" />
        </div>
        <div className="col-span-1">
          <label className="ll-label">Eyes</label>
          <input name="eyes" defaultValue={s("eyes")} className="ll-input" />
        </div>
      </div>

      <hr className="border-paper-border" />

      <div>
        <label className="ll-label">Exclusions <span className="text-ink-subtle normal-case">(comma-separated)</span></label>
        <input
          name="exclusions"
          defaultValue={model.exclusions.join(", ")}
          placeholder="no_fur, no_swim"
          className="ll-input"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-board-confirmed">Saved.</p>}

      <button type="submit" disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Saving…" : "Save card"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number | "";
}) {
  return (
    <div>
      <label className="ll-label">{label}</label>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        className="ll-input"
      />
    </div>
  );
}

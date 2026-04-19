"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateAgencyProfile } from "./actions";

type Agency = {
  id: string;
  name: string;
  city: string;
  country: string;
  currency: string;
  defaultCommissionPercent: number;
  legalName: string;
  addressLine: string;
  postalCode: string;
  siret: string;
  vatNumber: string;
  iban: string;
  bic: string;
  publicSiteEnabled: boolean;
  cities: string[];
};

export function AgencyProfileForm({
  agency,
  readOnly,
}: {
  agency: Agency;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (readOnly) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateAgencyProfile(fd);
      if (!res.ok) toast.error(res.error);
      else toast.success("Agency profile saved.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="ll-card p-6 space-y-5">
      <h2 className="font-medium">Agency profile</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Agency name</label>
          <input name="name" defaultValue={agency.name} disabled={readOnly} className="ll-input" />
        </div>
        <div>
          <label className="ll-label">City</label>
          <input name="city" defaultValue={agency.city} disabled={readOnly} className="ll-input" />
        </div>
        <div>
          <label className="ll-label">Country (ISO)</label>
          <input
            name="country"
            defaultValue={agency.country}
            maxLength={2}
            disabled={readOnly}
            className="ll-input uppercase"
          />
        </div>
        <div>
          <label className="ll-label">Currency</label>
          <input
            name="currency"
            defaultValue={agency.currency}
            maxLength={3}
            disabled={readOnly}
            className="ll-input uppercase"
          />
        </div>
        <div>
          <label className="ll-label">Default commission %</label>
          <input
            name="defaultCommissionPercent"
            type="number"
            step="0.1"
            defaultValue={agency.defaultCommissionPercent}
            disabled={readOnly}
            className="ll-input"
          />
        </div>
      </div>

      <h3 className="text-sm font-medium pt-3 border-t border-paper-border">Billing details (for invoices)</h3>
      <p className="text-xs text-ink-subtle -mt-3">
        Required on French invoices: legal name, address, SIRET, TVA number.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="ll-label">Legal name</label>
          <input name="legalName" defaultValue={agency.legalName} disabled={readOnly} className="ll-input" />
        </div>
        <div className="col-span-2">
          <label className="ll-label">Address</label>
          <input name="addressLine" defaultValue={agency.addressLine} disabled={readOnly} className="ll-input" />
        </div>
        <div>
          <label className="ll-label">Postal code</label>
          <input name="postalCode" defaultValue={agency.postalCode} disabled={readOnly} className="ll-input" />
        </div>
        <div>
          <label className="ll-label">SIRET</label>
          <input name="siret" defaultValue={agency.siret} disabled={readOnly} className="ll-input" />
        </div>
        <div>
          <label className="ll-label">TVA / VAT number</label>
          <input name="vatNumber" defaultValue={agency.vatNumber} disabled={readOnly} className="ll-input" />
        </div>
        <div />
        <div>
          <label className="ll-label">IBAN</label>
          <input name="iban" defaultValue={agency.iban} disabled={readOnly} className="ll-input" />
        </div>
        <div>
          <label className="ll-label">BIC</label>
          <input name="bic" defaultValue={agency.bic} disabled={readOnly} className="ll-input" />
        </div>
      </div>

      <div className="pt-3 border-t border-paper-border">
        <label className="ll-label">Operational cities <span className="text-ink-subtle normal-case">(comma-separated, for multi-city agencies)</span></label>
        <input
          name="cities"
          defaultValue={agency.cities.join(", ")}
          placeholder="Paris, Milan, London"
          disabled={readOnly}
          className="ll-input"
        />
      </div>

      <h3 className="text-sm font-medium pt-3 border-t border-paper-border">Public website</h3>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="publicSiteEnabled"
          defaultChecked={agency.publicSiteEnabled}
          disabled={readOnly}
        />
        Enable <code className="font-mono text-xs">/a/{agency.id.slice(0, 6)}…</code> public roster page
      </label>


      {!readOnly && (
        <button type="submit" disabled={pending} className="ll-btn-primary">
          {pending ? "Saving…" : "Save"}
        </button>
      )}
      {readOnly && (
        <p className="text-xs text-ink-subtle">
          Only the agency owner can edit these fields.
        </p>
      )}
    </form>
  );
}

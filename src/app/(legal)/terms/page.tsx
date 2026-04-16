export const metadata = { title: "Terms of service · LuxLane" };

export default function Terms() {
  return (
    <article className="space-y-5 text-sm leading-relaxed text-ink">
      <h1 className="font-serif text-3xl tracking-tight">Terms of service</h1>
      <p className="text-xs text-ink-subtle">Last updated: April 2026</p>

      <p>
        These are the terms under which an agency may use LuxLane. By creating an
        agency on LuxLane, the person doing so accepts these terms on behalf of the
        agency.
      </p>

      <h2 className="font-serif text-xl mt-8">Subscription</h2>
      <p>
        LuxLane is offered on a monthly subscription via Stripe Checkout. The first 14
        days are free. The agency may cancel any time via the Stripe Customer Portal;
        cancellation takes effect at the end of the current billing period.
      </p>

      <h2 className="font-serif text-xl mt-8">Acceptable use</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>One agency per subscription. No reselling LuxLane access.</li>
        <li>No uploading content without the model&apos;s consent.</li>
        <li>No uploading malware, illegal content, or content infringing third-party rights.</li>
        <li>No reverse-engineering, scraping, or interfering with the Service.</li>
      </ul>

      <h2 className="font-serif text-xl mt-8">Data ownership</h2>
      <p>
        The agency owns its roster data, job data, and any documents it uploads.
        LuxLane is the processor and stores them on the agency&apos;s behalf. The
        agency may export everything via the API at any time.
      </p>

      <h2 className="font-serif text-xl mt-8">Models&apos; rights</h2>
      <p>
        Models retain control of their personal records. Each model has a Privacy
        section in their app where they can download or delete their data. An agency
        cannot suppress that right.
      </p>

      <h2 className="font-serif text-xl mt-8">Stripe Connect &amp; payouts</h2>
      <p>
        When an agency connects a Stripe Express account and marks an invoice as PAID,
        LuxLane records a model payout. Actual fund transfers, where applicable, are
        carried out by Stripe under their own terms; LuxLane is not a financial
        institution.
      </p>

      <h2 className="font-serif text-xl mt-8">Liability</h2>
      <p>
        LuxLane is provided &ldquo;as is&rdquo;. We aim for high availability and back
        up the database daily, but the Service is not warranted to be error-free or
        uninterrupted. To the extent permitted by law, our maximum liability is
        limited to the subscription fees paid in the previous twelve months.
      </p>

      <h2 className="font-serif text-xl mt-8">Termination</h2>
      <p>
        We may suspend an account for violation of these terms. The agency may delete
        its account at any time; we&apos;ll keep a 30-day grace window before the data
        is permanently purged.
      </p>

      <h2 className="font-serif text-xl mt-8">Governing law</h2>
      <p>
        These terms are governed by French law. Disputes go to the competent courts of
        Paris, France, unless overridden by mandatory consumer-protection law of the
        agency&apos;s jurisdiction.
      </p>

      <h2 className="font-serif text-xl mt-8">Contact</h2>
      <p>
        <a className="underline" href="mailto:hello@luxlane.app">hello@luxlane.app</a>
      </p>
    </article>
  );
}

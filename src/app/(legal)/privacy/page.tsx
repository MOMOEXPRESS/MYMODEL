export const metadata = { title: "Privacy policy · LuxLane" };

export default function Privacy() {
  return (
    <article className="space-y-5 text-sm leading-relaxed text-ink">
      <h1 className="font-serif text-3xl tracking-tight">Privacy policy</h1>
      <p className="text-xs text-ink-subtle">Last updated: April 2026</p>

      <p>
        LuxLane is an operations platform for modeling agencies. This page explains
        what personal data we collect, why, how long we keep it, and how to ask us to
        delete it. We aim to be brief and honest.
      </p>

      <h2 className="font-serif text-xl mt-8">Who we are</h2>
      <p>
        LuxLane (the &ldquo;Service&rdquo;) is operated by the LuxLane team. Each agency
        using LuxLane is the data <em>controller</em> for the personal data of its own
        models, staff and contacts. LuxLane is the data <em>processor</em>.
      </p>

      <h2 className="font-serif text-xl mt-8">What we collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Account details: email, name, password (hashed), phone (optional).</li>
        <li>Agency profile: legal name, address, SIRET, TVA number, IBAN/BIC.</li>
        <li>Roster data: model measurements, division, exclusions, portfolio photos, documents (passport, visa, contract, tax form).</li>
        <li>Job activity: bookings, holds, assignments, messages, file uploads.</li>
        <li>Operational logs: login timestamps, audit events, error reports.</li>
      </ul>

      <h2 className="font-serif text-xl mt-8">Why we collect it</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>To operate your agency: roster, board, jobs, messaging, invoicing.</li>
        <li>To bill the agency through Stripe.</li>
        <li>To send transactional notifications (resets, invites, callsheets).</li>
        <li>To debug errors and detect abuse (brief retention).</li>
      </ul>

      <h2 className="font-serif text-xl mt-8">Subprocessors</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Vercel (hosting, EU/US).</li>
        <li>Neon Postgres (database, EU region by default).</li>
        <li>Vercel Blob (file storage).</li>
        <li>Stripe (subscription + payouts).</li>
        <li>Resend (transactional email).</li>
        <li>Upstash (rate-limit metadata).</li>
      </ul>

      <h2 className="font-serif text-xl mt-8">Retention</h2>
      <p>
        Active accounts: as long as the agency&apos;s subscription is active. Cancelled
        accounts: 30 days, then permanent purge of personal data (financial records may
        be retained for legal accounting periods). Trash items (jobs, invoices,
        contracts): 30 days.
      </p>

      <h2 className="font-serif text-xl mt-8">Your rights (GDPR)</h2>
      <p>
        Every account in LuxLane has a Privacy section with two one-click actions:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Export</strong> — download a JSON bundle of every record we hold on you.
        </li>
        <li>
          <strong>Delete</strong> — anonymizes your record immediately. Agency owners
          must transfer ownership before they can delete.
        </li>
      </ul>
      <p>
        To exercise rectification, restriction, or object to processing, email{" "}
        <a className="underline" href="mailto:privacy@luxlane.app">privacy@luxlane.app</a>.
      </p>

      <h2 className="font-serif text-xl mt-8">Cookies</h2>
      <p>
        We use a session cookie (<code>ll_session</code>) for authentication and a
        locale cookie (<code>ll_locale</code>) to remember your language preference.
        We do not use third-party tracking cookies.
      </p>

      <h2 className="font-serif text-xl mt-8">Contact</h2>
      <p>
        Questions? <a className="underline" href="mailto:privacy@luxlane.app">privacy@luxlane.app</a>.
        For complaints, the French CNIL is the supervisory authority for EU residents.
      </p>
    </article>
  );
}

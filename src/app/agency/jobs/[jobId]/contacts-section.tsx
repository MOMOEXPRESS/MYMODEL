"use client";

import { JobContact, JobContactRole } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { addJobContact, deleteJobContact } from "../actions";

export function ContactsSection({
  jobId,
  contacts,
}: {
  jobId: string;
  contacts: JobContact[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="ll-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Contacts</h2>
          <p className="text-xs text-ink-subtle mt-0.5">
            Client and production people tied to this job.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="ll-btn-secondary text-xs">
            <Plus size={14} /> Add contact
          </button>
        )}
      </div>

      {contacts.length === 0 && !showForm ? (
        <p className="mt-5 text-sm text-ink-muted">No contacts yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-paper-border">
          {contacts.map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </ul>
      )}

      {showForm && (
        <AddContactForm
          jobId={jobId}
          onCancel={() => setShowForm(false)}
          onAdded={() => setShowForm(false)}
        />
      )}
    </section>
  );
}

function ContactRow({ contact }: { contact: JobContact }) {
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!confirm(`Remove ${contact.name}?`)) return;
    const fd = new FormData();
    fd.set("contactId", contact.id);
    startTransition(async () => {
      await deleteJobContact(fd);
    });
  }
  return (
    <li className="py-2.5 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="font-medium">{contact.name}</div>
        <div className="text-xs text-ink-muted">
          {contact.role.toLowerCase()}
          {contact.company ? ` · ${contact.company}` : ""}
          {contact.email ? ` · ${contact.email}` : ""}
          {contact.phone ? ` · ${contact.phone}` : ""}
        </div>
      </div>
      <button onClick={remove} disabled={pending} className="ll-btn-ghost text-xs">
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function AddContactForm({
  jobId,
  onCancel,
  onAdded,
}: {
  jobId: string;
  onCancel: () => void;
  onAdded: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("jobId", jobId);
    setError(null);
    startTransition(async () => {
      const res = await addJobContact(fd);
      if (!res.ok) setError(res.error);
      else onAdded();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 border-t border-paper-border pt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input name="name" required placeholder="Name" className="ll-input text-sm" />
        <select name="role" defaultValue="CLIENT" className="ll-input text-sm">
          <option value="CLIENT">Client</option>
          <option value="BOOKER">Booker</option>
          <option value="PRODUCER">Producer</option>
          <option value="VENUE">Venue</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <input name="company" placeholder="Company" className="ll-input text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <input name="email" type="email" placeholder="Email" className="ll-input text-sm" />
        <input name="phone" placeholder="Phone" className="ll-input text-sm" />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="ll-btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="ll-btn-primary text-sm">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

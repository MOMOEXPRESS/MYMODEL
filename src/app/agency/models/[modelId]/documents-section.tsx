"use client";

import { ModelDocument, DocumentType } from "@prisma/client";
import { FileText, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { deleteDocument, uploadDocument } from "./actions";

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "PASSPORT", label: "Passport" },
  { value: "VISA", label: "Work visa" },
  { value: "TAX_FORM", label: "Tax form" },
  { value: "CONTRACT", label: "Contract" },
  { value: "RELEASE", label: "Model release" },
  { value: "BANK_INFO", label: "Bank info" },
  { value: "OTHER", label: "Other" },
];

export function DocumentsSection({
  modelId,
  documents,
}: {
  modelId: string;
  documents: ModelDocument[];
}) {
  const [type, setType] = useState<DocumentType>("PASSPORT");
  const [expiresAt, setExpiresAt] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onFile(file: File) {
    const fd = new FormData();
    fd.set("modelId", modelId);
    fd.set("type", type);
    fd.set("expiresAt", expiresAt);
    fd.set("file", file);
    const res = await uploadDocument(fd);
    if (!res.ok) setError(res.error);
    else {
      setError(null);
      setExpiresAt("");
    }
  }

  return (
    <section className="ll-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-medium">Documents</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DocumentType)}
            className="ll-input w-auto text-xs"
          >
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            placeholder="Expires"
            className="ll-input w-auto text-xs"
            title="Expiry date (optional)"
          />
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
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) startTransition(() => onFile(file));
            }}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {documents.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">
          No documents yet. Upload passport, visa, tax form and contract here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-paper-border">
          {documents.map((d) => (
            <DocumentRow key={d.id} doc={d} />
          ))}
        </ul>
      )}

      {pending && <p className="mt-3 text-xs text-ink-subtle">Uploading…</p>}
    </section>
  );
}

function DocumentRow({ doc }: { doc: ModelDocument }) {
  const [pending, startTransition] = useTransition();
  const expiring =
    doc.expiresAt &&
    doc.expiresAt.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;
  const expired = doc.expiresAt && doc.expiresAt.getTime() < Date.now();

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-md bg-paper border border-paper-border flex items-center justify-center text-ink-muted shrink-0">
        <FileText size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium hover:underline underline-offset-4 truncate block"
        >
          {doc.fileName}
        </a>
        <div className="text-xs text-ink-subtle mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{doc.type.replace("_", " ").toLowerCase()}</span>
          {doc.expiresAt && (
            <>
              <span>·</span>
              <span
                className={
                  expired ? "text-red-600 inline-flex items-center gap-1"
                  : expiring ? "text-board-option1 inline-flex items-center gap-1"
                  : ""
                }
              >
                {(expired || expiring) && <AlertTriangle size={11} />}
                {expired ? "Expired" : "Expires"} {doc.expiresAt.toISOString().slice(0, 10)}
              </span>
            </>
          )}
        </div>
      </div>
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set("documentId", doc.id);
            await deleteDocument(fd);
          })
        }
      >
        <button
          type="submit"
          disabled={pending}
          className="ll-btn-ghost text-xs"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </form>
    </li>
  );
}

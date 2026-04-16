"use client";

import { QrCode, Copy, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import qrcode from "qrcode";

export function ScoutingLink({ signupCode }: { signupCode: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const link = `${origin}/scouted/${signupCode}`;
    setUrl(link);
    // Render the QR to a data-URL so we can drop it straight into an <img>.
    qrcode
      .toDataURL(link, { margin: 2, scale: 8, color: { dark: "#0B0B0C", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, signupCode]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="ll-btn-secondary text-xs">
        <QrCode size={14} /> Scouting link
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="ll-card bg-paper-elevated shadow-2xl w-full max-w-md overflow-hidden"
          >
            <header className="px-5 py-3 border-b border-paper-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode size={14} />
                <h3 className="font-medium text-sm">Scouting link</h3>
              </div>
              <button onClick={() => setOpen(false)} className="ll-btn-ghost p-1">
                <X size={14} />
              </button>
            </header>

            <div className="p-5 flex flex-col items-center">
              <p className="text-xs text-ink-muted text-center max-w-sm">
                Show this QR at an open casting — a spotted model scans and
                fills a form. The submission lands in your Scouting pipeline as
                a <strong>Spotted</strong> prospect, not on the main roster.
              </p>

              <div className="mt-5 p-3 bg-white rounded-xl border border-paper-border">
                {qr ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={qr} alt="Scouting QR" className="w-56 h-56" />
                ) : (
                  <div className="w-56 h-56 bg-paper animate-pulse rounded" />
                )}
              </div>

              <div className="mt-5 w-full">
                <div className="ll-input flex items-center gap-2 font-mono text-xs">
                  <span className="truncate flex-1">{url}</span>
                  <button
                    onClick={copy}
                    className="ll-btn-ghost p-1"
                    title="Copy link"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <p className="mt-4 text-[10px] text-ink-subtle text-center">
                The public page is cold-cached for a few seconds per scan.
                Each submission is rate-limited.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

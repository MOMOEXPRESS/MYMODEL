"use client";

import { QrCode, Copy, Check, X, Download, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import qrcode from "qrcode";

export function ScoutingLink({
  signupCode,
  agencyName,
}: {
  signupCode: string;
  agencyName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const link = `${origin}/scouted/${signupCode}`;
    setUrl(link);
    // High scale = crisp when printed at A6.
    qrcode
      .toDataURL(link, {
        margin: 2,
        scale: 14,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, signupCode]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadPng() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `luxlane-scouting-${signupCode}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function printCard() {
    if (!qr) return;
    // Open a barebones print window with an A6-ish card centered on the
    // page: QR, agency name, "Scan to get scouted", the code underneath.
    const w = window.open("", "_blank", "width=560,height=760");
    if (!w) return;
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>LuxLane · Scouting · ${signupCode}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #FAFAF7; color: #0B0B0C;
      font-family: -apple-system, system-ui, sans-serif; }
    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 24px; }
    .card { width: 420px; aspect-ratio: 3/4; background: #fff; border: 1px solid #E7E5DF;
      border-radius: 14px; padding: 28px; display: flex; flex-direction: column;
      align-items: center; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
    .eyebrow { font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
      color: #8A8A92; margin-bottom: 4px; }
    .agency { font-family: Georgia, serif; font-size: 26px; letter-spacing: -0.01em;
      line-height: 1.05; }
    .tagline { font-size: 12px; color: #54545A; margin-top: 8px; max-width: 320px; }
    .qrwrap { margin: 22px 0; padding: 10px; background: #fff; border: 1px solid #E7E5DF;
      border-radius: 8px; }
    .qr { width: 260px; height: 260px; display: block; }
    .code { font-family: ui-monospace, monospace; font-size: 12px; color: #54545A;
      letter-spacing: 2px; margin-top: auto; }
    .brand { font-family: Georgia, serif; font-size: 14px; letter-spacing: -0.01em;
      color: #8A8A92; margin-top: 6px; }
    @media print {
      @page { size: A6; margin: 6mm; }
      .page { min-height: auto; padding: 0; }
      .card { width: 100%; aspect-ratio: auto; border: none; box-shadow: none; padding: 6mm; }
      .qr { width: 52mm; height: 52mm; }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="page">
    <div class="card">
      <div class="eyebrow">Scouted by</div>
      <div class="agency">${escapeHtml(agencyName ?? "")}</div>
      <div class="tagline">Scan to leave your details with us. No account required — we'll be in touch.</div>
      <div class="qrwrap"><img class="qr" src="${qr}" alt="Scouting QR" /></div>
      <div class="code">${signupCode}</div>
      <div class="brand">Powered by LuxLane</div>
    </div>
  </div>
</body>
</html>`);
    w.document.close();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="ll-btn-secondary text-xs">
        <QrCode size={14} /> Scouting link
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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
                Show or hand out the QR at an open casting. A spotted model scans,
                fills a quick form, and lands in your <strong>Spotted</strong>{" "}
                column — not the main roster.
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

              <div className="mt-4 flex items-center gap-2 w-full">
                <button
                  onClick={downloadPng}
                  disabled={!qr}
                  className="ll-btn-secondary text-xs flex-1"
                  title="Download PNG"
                >
                  <Download size={13} /> PNG
                </button>
                <button
                  onClick={printCard}
                  disabled={!qr}
                  className="ll-btn-primary text-xs flex-1"
                  title="Print a handout card (A6)"
                >
                  <Printer size={13} /> Print card
                </button>
              </div>

              <p className="mt-4 text-[10px] text-ink-subtle text-center">
                Every submission is rate-limited. The public page carries your
                agency name and a consent line.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

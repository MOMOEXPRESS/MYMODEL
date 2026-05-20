"use client";

import { useTransition } from "react";
import { Copy, Link2, ShieldOff, RotateCcw } from "lucide-react";
import {
  enablePortal,
  revokePortal,
  rotatePortalToken,
  linkClientPlatformUser,
} from "../actions";

export function ClientDetailActions({
  clientId,
  portalEnabled,
  portalUrl,
  hasPlatformUser,
}: {
  clientId: string;
  portalEnabled: boolean;
  portalUrl: string | null;
  hasPlatformUser: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(fn: (fd: FormData) => Promise<{ ok: boolean }>) {
    const fd = new FormData();
    fd.set("clientId", clientId);
    startTransition(() => {
      void fn(fd);
    });
  }

  return (
    <div className="mt-6 ll-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">Access</h3>
      <div className="flex flex-wrap gap-2">
        {!portalEnabled ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(enablePortal)}
            className="ll-btn-primary text-xs"
          >
            <Link2 size={14} /> Enable portal
          </button>
        ) : (
          <>
            {portalUrl && (
              <button
                type="button"
                className="ll-btn-secondary text-xs"
                onClick={() => navigator.clipboard.writeText(portalUrl)}
              >
                <Copy size={14} /> Copy magic link
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(rotatePortalToken)}
              className="ll-btn-secondary text-xs"
            >
              <RotateCcw size={14} /> Rotate link
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(revokePortal)}
              className="ll-btn-ghost text-xs"
            >
              <ShieldOff size={14} /> Revoke
            </button>
          </>
        )}
        {!hasPlatformUser && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(linkClientPlatformUser)}
            className="ll-btn-secondary text-xs"
          >
            Link platform account
          </button>
        )}
      </div>
      {portalEnabled && (
        <p className="text-xs text-ink-muted">
          Clients with a linked LuxLane login also see bookings at <strong>/c/jobs</strong>.
        </p>
      )}
    </div>
  );
}

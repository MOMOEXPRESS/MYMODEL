"use client";

// Small clickable chip that opens the command palette. Lives in the agency
// sidebar so the keyboard shortcut gets discovered. Dispatches a synthetic
// ⌘K keydown on click to re-use the palette's existing listener.

import { Search } from "lucide-react";

export function CommandKHint() {
  function open() {
    const e = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(e);
  }
  return (
    <button
      type="button"
      onClick={open}
      className="mx-4 mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-paper-border bg-paper text-ink-muted hover:text-ink hover:bg-white/5 text-xs transition-colors"
    >
      <Search size={12} />
      <span className="flex-1 text-left">Quick find</span>
      <span className="kbd">⌘</span>
      <span className="kbd">K</span>
    </button>
  );
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-ink-subtle">
      <div className="relative w-6 h-6">
        <span className="absolute inset-0 rounded-full border-2 border-paper-border" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin-slow" />
      </div>
      <span className="text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

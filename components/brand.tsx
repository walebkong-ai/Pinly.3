export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--foreground)] text-white shadow-lg shadow-black/10">
        <span className="font-[var(--font-serif)] text-lg">P</span>
      </div>
      {!compact && (
        <div>
          <p className="font-[var(--font-serif)] text-2xl leading-none">Pinly</p>
          <p className="text-xs text-[var(--foreground)]/60">Private travel memories, pinned with care.</p>
        </div>
      )}
    </div>
  );
}

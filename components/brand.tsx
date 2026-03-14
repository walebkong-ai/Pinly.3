import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden drop-shadow-sm">
        <Image src="/logo.png" alt="Pinly Logo" width={48} height={48} className="object-cover" />
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

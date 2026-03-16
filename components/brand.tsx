import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

export const BRAND_LOGO_BORDER_COLOR = "#0f746c";
export const BRAND_LOGO_FRAME_CLASS_NAME =
  "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-[var(--surface-strong)] p-1.5 drop-shadow-sm transition-transform group-hover:scale-105";
export const BRAND_LOGO_FRAME_STYLE: CSSProperties = { borderColor: BRAND_LOGO_BORDER_COLOR };

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/map" className="group flex items-center gap-3 transition-transform active:scale-95">
      <div className={BRAND_LOGO_FRAME_CLASS_NAME} style={BRAND_LOGO_FRAME_STYLE}>
        <Image src="/logo.png" alt="Pinly Logo" width={34} height={34} className="h-full w-full object-contain" />
      </div>
      {!compact && (
        <div className="transition-opacity group-hover:opacity-80">
          <p className="font-[var(--font-serif)] text-2xl leading-none">Pinly</p>
          <p className="text-xs text-[var(--foreground)]/60">Private travel memories, pinned with care.</p>
        </div>
      )}
    </Link>
  );
}

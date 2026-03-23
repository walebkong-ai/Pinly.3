import Link from "next/link";
import { cn } from "@/lib/utils";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-xs text-[var(--foreground)]/58", className)}>
      <Link href="/terms" className="rounded-full px-2 py-1 transition hover:text-[var(--foreground)]">
        Terms
      </Link>
      <Link href="/privacy" className="rounded-full px-2 py-1 transition hover:text-[var(--foreground)]">
        Privacy
      </Link>
      <Link href="/delete-account" className="rounded-full px-2 py-1 transition hover:text-[var(--foreground)]">
        Delete account
      </Link>
    </div>
  );
}

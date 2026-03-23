import { LoaderCircle, MapPinned } from "lucide-react";
import { Brand } from "@/components/brand";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="glass-panel w-full max-w-md rounded-[2rem] p-6 text-center shadow-[0_24px_60px_rgba(24,85,56,0.12)]">
        <div className="mx-auto w-fit">
          <Brand compact />
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Opening Pinly</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-3xl">Restoring your travel map</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]/64">
          Bringing back your map, recent memories, and the people you travel with.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPinned className="h-4 w-4 text-[var(--map-accent)]" />
              Map-first
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/58">
              Preparing your memory map and location-based views.
            </p>
          </div>
          <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent)]" />
              Syncing
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/58">
              Checking messages, notifications, and your last session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

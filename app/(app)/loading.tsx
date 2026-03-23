import { LoaderCircle, MapPinned } from "lucide-react";
import { Brand } from "@/components/brand";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-3 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] animate-in fade-in duration-500">
      <div className="glass-panel w-full max-w-lg rounded-[2rem] p-5 shadow-[0_24px_60px_rgba(24,85,56,0.12)]">
        <div className="flex items-center gap-3">
          <Brand compact />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Opening your app</p>
            <h2 className="font-[var(--font-serif)] text-2xl">Loading Pinly</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPinned className="h-4 w-4 text-[var(--map-accent)]" />
              Places first
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/58">
              Rebuilding the map view and the places behind your memories.
            </p>
          </div>
          <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent)]" />
              Syncing
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/58">
              Refreshing your feed, notifications, and friend activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
      <div className="glass-panel flex items-center justify-center rounded-full p-4 shadow-sm">
        <LoaderCircle className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
      <p className="text-sm font-medium tracking-wide text-[var(--foreground)]/50 uppercase">
        Loading...
      </p>
    </div>
  );
}

import { MapPinned } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWantToGoPlaces } from "@/lib/data";
import { WantToGoPlacesList } from "@/components/places/want-to-go-places-list";

export default async function WantToGoPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const places = await getWantToGoPlaces(session.user.id, 64);

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[1.75rem] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,159,28,0.14)] text-[var(--accent)]">
            <MapPinned className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Want to go</p>
            <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl md:text-3xl">Saved places</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
              Keep future stops and revisit ideas separate from the memories you have already pinned.
            </p>
          </div>
        </div>
      </section>

      <WantToGoPlacesList initialPlaces={places} />
    </div>
  );
}

import { MapPinned } from "lucide-react";
import { redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
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
    <AppScreen>
      <div className="pinly-content-shell pinly-screen-stack animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <section className="glass-panel pinly-panel">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,159,28,0.14)] text-[var(--accent)]">
              <MapPinned className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="pinly-eyebrow">Want to go</p>
              <h1 className="pinly-display-title">Saved places</h1>
              <p className="pinly-body-copy">
                Keep future stops and revisit ideas separate from the memories you have already pinned.
              </p>
            </div>
          </div>
        </section>

        <WantToGoPlacesList initialPlaces={places} />
      </div>
    </AppScreen>
  );
}

import { AppScreen } from "@/components/app/app-screen";
import { MapPageClient } from "@/components/map/map-page-client";

export default function MapPage() {
  return (
    <AppScreen
      className="h-full min-h-0"
      scrollClassName="flex overflow-hidden pb-0"
      contentClassName="flex min-h-0 flex-1"
    >
      <MapPageClient />
    </AppScreen>
  );
}

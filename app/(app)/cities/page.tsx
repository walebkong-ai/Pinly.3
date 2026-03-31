import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppScreen } from "@/components/app/app-screen";
import { CityBrowser } from "@/components/cities/city-browser";

export default async function CitiesPage() {
  const session = await auth();
  const settings = session?.user?.id
    ? await prisma.userSettings.findUnique({
        where: { userId: session.user.id },
        select: { showLikeCounts: true }
      })
    : null;

  return (
    <AppScreen>
      <CityBrowser showLikeCounts={settings?.showLikeCounts ?? true} />
    </AppScreen>
  );
}

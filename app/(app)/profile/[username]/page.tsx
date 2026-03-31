import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { AppScreen } from "@/components/app/app-screen";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVisibleCollectionsForUser, getProfileData } from "@/lib/data";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";
import { getRelationshipDetails } from "@/lib/relationships";
import { ProfileView } from "@/components/profile/profile-view";
import { normalizeUsername } from "@/lib/validation";

type Props = {
  params: Promise<{ username: string }>;
};

async function getViewerProfileSettings(userId: string) {
  try {
    return await prisma.userSettings.findUnique({
      where: { userId },
      select: { showLikeCounts: true }
    });
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return null;
    }

    throw error;
  }
}

export default async function ProfilePage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.id || !session.user.username) {
    notFound();
  }

  const { username } = await params;
  const normalizedRouteUsername = normalizeUsername(username);
  
  let resolvedUsername = normalizedRouteUsername;
  if (normalizedRouteUsername === "me") {
    const dbUser = await prisma.user.findUnique({ 
      where: { id: session.user.id }, 
      select: { username: true } 
    });
    if (!dbUser) notFound();
    resolvedUsername = dbUser.username;
  }

  try {
    const [profile, settings] = await Promise.all([
      getProfileData(resolvedUsername, session.user.id),
      getViewerProfileSettings(session.user.id)
    ]);

    if (!profile) {
      notFound();
    }

    const isOwnProfile = profile.user.id === session.user.id;
    const [collections, relationship] = await Promise.all([
      getVisibleCollectionsForUser(session.user.id, profile.user.id, 6),
      getRelationshipDetails(session.user.id, profile.user.id)
    ]);

    return (
      <AppScreen>
        <ProfileView
          profile={profile}
          isOwnProfile={isOwnProfile}
          showLikeCounts={settings?.showLikeCounts ?? true}
          collections={collections}
          relationship={relationship}
        />
      </AppScreen>
    );
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      // Fall through to error card below
    } else {
      // Re-throw unexpected errors to Next.js error boundary unless it's a data-layer issue
      const message = error instanceof Error ? error.message : "";
      const isDataError =
        message.includes("prisma") ||
        message.includes("ECONNREFUSED") ||
        message.includes("timeout") ||
        message.includes("connect");

      if (!isDataError) {
        throw error;
      }
    }

    return (
      <AppScreen>
        <div className="pinly-content-shell animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          <div className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-soft)]">
              <AlertTriangle className="h-6 w-6 text-[var(--foreground)]/60" />
            </div>
            <h2 className="font-[var(--font-serif)] text-xl">Could not load profile</h2>
            <p className="text-sm leading-6 text-[var(--foreground)]/60">
              Something went wrong while loading this profile. Please try again.
            </p>
            <Link
              href={`/profile/${resolvedUsername}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              Reload
            </Link>
          </div>
        </div>
      </AppScreen>
    );
  }
}

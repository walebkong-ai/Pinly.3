import { notFound } from "next/navigation";
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
    <ProfileView
      profile={profile}
      isOwnProfile={isOwnProfile}
      showLikeCounts={settings?.showLikeCounts ?? true}
      collections={collections}
      relationship={relationship}
    />
  );
}

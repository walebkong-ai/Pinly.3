import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProfileData } from "@/lib/data";
import { ProfileView } from "@/components/profile/profile-view";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.id || !session.user.username) {
    notFound();
  }

  const { username } = await params;
  
  let resolvedUsername = username;
  if (username === "me") {
    const dbUser = await prisma.user.findUnique({ 
      where: { id: session.user.id }, 
      select: { username: true } 
    });
    if (!dbUser) notFound();
    resolvedUsername = dbUser.username;
  }

  const profile = await getProfileData(resolvedUsername, session.user.id);

  if (!profile) {
    notFound();
  }

  return <ProfileView profile={profile} isOwnProfile={profile.user.id === session.user.id} />;
}

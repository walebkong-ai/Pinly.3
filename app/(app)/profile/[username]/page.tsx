import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
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
  const resolvedUsername = username === "me" ? session.user.username : username;
  const profile = await getProfileData(resolvedUsername, session.user.id);

  if (!profile) {
    notFound();
  }

  return <ProfileView profile={profile} isOwnProfile={resolvedUsername === session.user.username} />;
}

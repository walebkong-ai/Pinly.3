import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUnreadGroupMessageCount, getUnreadNotificationCount } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app/app-shell";

export default async function PrivateLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [dbUser, initialUnreadGroupsCount, initialUnreadNotificationsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, username: true, email: true, avatarUrl: true }
    }),
    getUnreadGroupMessageCount(session.user.id),
    getUnreadNotificationCount(session.user.id)
  ]);

  if (!dbUser) {
    redirect("/sign-in");
  }

  return (
    <AppShell
      user={dbUser}
      initialUnreadGroupsCount={initialUnreadGroupsCount}
      initialUnreadNotificationsCount={initialUnreadNotificationsCount}
    >
      {children}
    </AppShell>
  );
}

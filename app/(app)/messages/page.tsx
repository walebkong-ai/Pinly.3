import { redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { auth } from "@/lib/auth";
import { getMessageGroups } from "@/lib/data";
import { GroupsList } from "@/components/groups/groups-list";

export default async function MessagesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const groups = await getMessageGroups(session.user.id);

  return (
    <AppScreen>
      <GroupsList initialGroups={groups} />
    </AppScreen>
  );
}

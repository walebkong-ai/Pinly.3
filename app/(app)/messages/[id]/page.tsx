import { auth } from "@/lib/auth";
import { GroupDetail } from "@/components/groups/group-detail";

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  return <GroupDetail groupId={id} viewerId={session?.user?.id ?? ""} />;
}

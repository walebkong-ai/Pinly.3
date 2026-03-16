import { auth } from "@/lib/auth";
import { GroupDetail } from "@/components/groups/group-detail";
import { BackButton } from "@/components/post/back-button";

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  return (
    <div className="space-y-4">
      <BackButton fallbackHref="/messages" label="Messages" />
      <GroupDetail groupId={id} viewerId={session?.user?.id ?? ""} />
    </div>
  );
}

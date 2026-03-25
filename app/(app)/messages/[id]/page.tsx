import { auth } from "@/lib/auth";
import { getGroupConversation } from "@/lib/data";
import { redirect } from "next/navigation";
import { GroupDetail } from "@/components/groups/group-detail";
import { BackButton } from "@/components/post/back-button";

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const viewerId = session.user.id;
  const conversation = await getGroupConversation(viewerId, id);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <BackButton fallbackHref="/messages" label="Messages" />
      <div className="min-h-0 flex-1">
        <GroupDetail
          groupId={id}
          viewerId={viewerId}
          initialGroup={conversation.status === "ok" ? conversation.group : null}
          initialMessages={conversation.status === "ok" ? conversation.messages : []}
        />
      </div>
    </div>
  );
}

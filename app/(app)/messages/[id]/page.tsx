import { auth } from "@/lib/auth";
import { getGroupConversation } from "@/lib/data";
import { redirect } from "next/navigation";
import { GroupDetail } from "@/components/groups/group-detail";

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const viewerId = session.user.id;
  const conversation = await getGroupConversation(viewerId, id);

  return (
    <GroupDetail
      groupId={id}
      viewerId={viewerId}
      backHref="/messages"
      backLabel="Messages"
      initialGroup={conversation.status === "ok" ? conversation.group : null}
      initialMessages={conversation.status === "ok" ? conversation.messages : []}
    />
  );
}

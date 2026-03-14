import { GroupDetail } from "@/components/groups/group-detail";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetail groupId={id} />;
}

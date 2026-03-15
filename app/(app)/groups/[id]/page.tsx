import { redirect } from "next/navigation";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/messages/${id}`);
}

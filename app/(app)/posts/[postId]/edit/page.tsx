import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { BackButton } from "@/components/post/back-button";
import { EditPostForm } from "@/components/post/edit-post-form";

type Props = {
  params: Promise<{ postId: string }>;
};

export default async function EditPostPage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { postId } = await params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post || post.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <BackButton />
      <EditPostForm post={post} />
    </div>
  );
}

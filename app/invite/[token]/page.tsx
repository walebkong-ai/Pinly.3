import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Verify token exists and is valid
  const invite = await prisma.inviteLink.findUnique({
    where: { token },
    include: {
      createdByUser: true
    }
  });

  if (!invite) {
    return notFound();
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-panel max-w-sm rounded-[2rem] p-8 text-center">
          <h1 className="text-2xl font-[var(--font-serif)]">Invite Expired</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/60">
            This invite link is no longer valid. Ask for a new one!
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();

  // If not logged in, ask them to log in / sign up
  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="glass-panel w-full max-w-sm rounded-[2rem] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10 text-2xl">
            👋
          </div>
          <h1 className="text-2xl font-[var(--font-serif)]">You're Invited!</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/60">
            <strong>{invite.createdByUser.name}</strong> invited you to join Pinly.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <a 
              href={`/sign-up?invite=${token}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-95"
            >
              Sign Up to Accept
            </a>
            <a 
              href={`/sign-in?callbackUrl=/invite/${token}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--card-strong)] border px-4 py-3 text-sm font-medium transition hover:bg-white/50"
            >
              I already have an account
            </a>
          </div>
        </div>
      </div>
    );
  }

  const currentUserId = session.user.id;

  // Cannot invite yourself
  if (currentUserId === invite.createdByUserId) {
    redirect("/friends");
  }

  // Check if they are already friends
  const existingFriendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: currentUserId, userBId: invite.createdByUserId },
        { userAId: invite.createdByUserId, userBId: currentUserId },
      ]
    }
  });

  if (existingFriendship) {
    redirect("/friends");
  }

  // Auto-establish friendship from the valid invite token
  try {
    await prisma.friendship.create({
      data: {
        userAId: currentUserId,
        userBId: invite.createdByUserId
      }
    });

    // Optionally delete pending requests between them
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { fromUserId: currentUserId, toUserId: invite.createdByUserId },
          { fromUserId: invite.createdByUserId, toUserId: currentUserId }
        ]
      }
    });

  } catch (error) {
    // If it fails (e.g. unique constraint race condition), just go to friends
    console.error("Failed to accept invite:", error);
  }

  redirect("/friends?newFriend=true");
}

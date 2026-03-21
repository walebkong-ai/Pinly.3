import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LegalLinks } from "@/components/legal/legal-links";
import { LEGAL_LAST_UPDATED_LABEL } from "@/lib/legal";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/post/back-button";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        username: true,
        avatarUrl: true
      }
    }),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        showLikeCounts: true,
        commentsEnabled: true
      }
    })
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <BackButton fallbackHref={`/profile/${user.username}`} label="Profile" />
      <section className="glass-panel rounded-[1.75rem] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Settings</p>
        <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl">Profile settings</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
          Manage your profile photo and the interaction controls tied to your posts.
        </p>
      </section>

      <section className="glass-panel rounded-[1.75rem] p-4">
        <SettingsForm
          initialProfile={user}
          initialSettings={{
            showLikeCounts: settings?.showLikeCounts ?? true,
            commentsEnabled: settings?.commentsEnabled ?? true
          }}
        />
      </section>

      <section className="glass-panel rounded-[1.75rem] p-4">
        <p className="text-sm font-medium">Legal</p>
        <p className="mt-1 text-xs leading-5 text-[var(--foreground)]/58">
          Review the current Terms of Service and Privacy Policy. Last updated {LEGAL_LAST_UPDATED_LABEL}.
        </p>
        <LegalLinks className="mt-3" />
      </section>
    </div>
  );
}

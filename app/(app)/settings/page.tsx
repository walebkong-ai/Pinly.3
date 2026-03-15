import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/post/back-button";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <BackButton />
      <section className="glass-panel rounded-[1.75rem] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Settings</p>
        <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl">Display preferences</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
          Control how likes and comments appear in your feed.
        </p>
      </section>

      <section className="glass-panel rounded-[1.75rem] p-4">
        <SettingsForm />
      </section>
    </div>
  );
}

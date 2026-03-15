import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNotifications } from "@/lib/data";
import { NotificationsList } from "@/components/notifications/notifications-list";

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const notifications = await getNotifications(session.user.id, 50);

  return (
    <div className="mx-auto max-w-2xl animate-in space-y-4 fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[1.75rem] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Notifications</p>
            <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl md:text-3xl">Stay close to your circle</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
              See the high-value activity around your memories without turning Pinly into a noisy inbox.
            </p>
          </div>
        </div>
      </section>

      <NotificationsList initialNotifications={notifications} />
    </div>
  );
}

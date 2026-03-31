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
    <div className="pinly-content-shell pinly-screen-stack animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel pinly-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="pinly-eyebrow">Notifications</p>
            <h1 className="pinly-display-title">Stay close to your circle</h1>
            <p className="pinly-body-copy">
              See the high-value activity around your memories without turning Pinly into a noisy inbox.
            </p>
          </div>
        </div>
      </section>

      <NotificationsList initialNotifications={notifications} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, LockKeyhole, MapPinned, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MapPinned,
    title: "Map-first memories",
    description: "Every post is intentionally tied to a place, not your live location."
  },
  {
    icon: Users,
    title: "Friends-only by default",
    description: "Your travel map stays private to trusted people you have accepted."
  },
  {
    icon: Compass,
    title: "City discovery through people you trust",
    description: "Browse cities, neighborhoods, and places through real trips from friends."
  },
  {
    icon: LockKeyhole,
    title: "No surveillance vibes",
    description: "Pinly is about memory and context, not background tracking."
  }
];

export default async function LandingPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/map");
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <section className="glass-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <nav className="relative z-10 flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-[var(--foreground)]/70">
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button>Start mapping memories</Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mt-16 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--foreground)]/60">
              Private social travel app
            </p>
            <h1 className="max-w-3xl font-[var(--font-serif)] text-5xl leading-tight text-balance sm:text-7xl">
              See the world through your friends, not through a feed.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--foreground)]/72">
              Pinly turns travel photos and videos into a shared memory map. Add friends, post from places you loved,
              and zoom into cities to relive moments with the people you trust.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button className="w-full sm:w-auto">Create your account</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Explore the demo
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-[1.75rem] border bg-white/72 p-5 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/68">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

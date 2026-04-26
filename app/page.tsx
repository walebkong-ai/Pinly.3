import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, LockKeyhole, MapPinned, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { LegalLinks } from "@/components/legal/legal-links";
import { HeroGlobeBackground } from "@/components/marketing/hero-globe-background";
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
    <main className="pinly-document-page pinly-document-page--landing mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
      <section className="landing-hero glass-panel relative isolate overflow-hidden rounded-[1.75rem] p-4 sm:rounded-[2rem] sm:p-10">
        <div aria-hidden="true" className="landing-hero__ambient pointer-events-none absolute inset-0 z-0" />
        <HeroGlobeBackground />
        <div aria-hidden="true" className="landing-hero__readability pointer-events-none absolute inset-0 z-[2]" />
        <nav className="landing-hero__nav relative z-20 flex items-center justify-between gap-3">
          <div className="sm:hidden">
            <Brand compact />
          </div>
          <div className="hidden sm:block">
            <Brand />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-[var(--foreground)]/70">
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button className="min-h-[2.625rem] px-3 text-sm sm:min-h-[var(--pinly-control-height)] sm:px-4 sm:text-[0.9375rem]">
                Start mapping memories
              </Button>
            </Link>
          </div>
        </nav>

        <div className="landing-hero__content relative z-20 mt-10 grid gap-6 lg:mt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">
          <div className="landing-hero__copy">
            <p className="landing-hero__eyebrow mb-3 inline-flex rounded-full border bg-[var(--surface-soft)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--foreground)]/60 sm:mb-4">
              Private social travel app
            </p>
            <h1 className="landing-hero__title max-w-3xl font-[var(--font-serif)] text-[clamp(2.65rem,11vw,3.25rem)] leading-[0.98] text-balance sm:text-7xl sm:leading-tight">
              See the world through your friends, not through a feed.
            </h1>
            <p className="landing-hero__description mt-4 max-w-xl text-base leading-7 text-[var(--foreground)]/72 sm:mt-6 sm:max-w-2xl sm:text-lg sm:leading-8">
              Pinly turns travel photos and videos into a shared memory map. Add friends, post from places you loved,
              and zoom into cities to relive moments with the people you trust.
            </p>
            <div className="landing-hero__actions mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link href="/sign-up">
                <Button className="min-h-[2.75rem] w-full sm:min-h-[var(--pinly-control-height)] sm:w-auto">Create your account</Button>
              </Link>
              <Link href="/sign-in?demo=1">
                <Button variant="secondary" className="min-h-[2.75rem] w-full sm:min-h-[var(--pinly-control-height)] sm:w-auto">
                  Explore the demo
                </Button>
              </Link>
            </div>
            <LegalLinks className="landing-hero__legal mt-3 gap-2 sm:mt-5 sm:gap-3" />
          </div>

          <div className="landing-hero__features grid gap-3 sm:grid-cols-2 sm:gap-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="landing-hero__feature-card rounded-[1.5rem] border p-4 sm:rounded-[1.75rem] sm:p-5">
                <div className="landing-hero__feature-icon mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--map-accent-soft)] text-[var(--map-accent)] sm:mb-4 sm:h-11 sm:w-11">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/68">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

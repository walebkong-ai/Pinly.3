import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { SignInForm } from "@/components/auth/sign-in-form";
import { LegalLinks } from "@/components/legal/legal-links";
import { DEFAULT_DEMO_USER_EMAIL, DEMO_PASSWORD } from "@/lib/demo-config";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/map");
  }

  return (
    <main className="pinly-auth-page pinly-centered-page mx-auto flex max-w-5xl items-start px-4 py-2 sm:items-center sm:px-6 sm:py-10">
      <div className="pinly-auth-shell grid w-full gap-2.5 rounded-[1.75rem] border bg-[var(--surface-strong)] p-3 shadow-xl shadow-black/5 sm:gap-6 sm:rounded-[2rem] sm:p-6 md:grid-cols-[1fr_0.92fr] md:p-10">
        <div className="order-2 pinly-auth-hero rounded-[1.5rem] bg-[var(--foreground)] p-3.5 text-white sm:rounded-[1.75rem] sm:p-8 md:order-1">
          <Brand compact />
          <h1 className="pinly-auth-hero-title mt-3 font-[var(--font-serif)] text-[1.9rem] leading-tight sm:mt-8 sm:text-4xl">
            Welcome back to your map.
          </h1>
          <p className="pinly-auth-hero-copy mt-2.5 max-w-md text-[13px] leading-5 text-white/72 sm:mt-4 sm:text-base sm:leading-7">
            Sign in to revisit your own travel memories and see what your friends have pinned around the world.
          </p>
          <div className="pinly-auth-hero-note mt-3 rounded-[1.35rem] border border-white/10 bg-white/8 p-3 text-[11px] leading-[1.35] text-white/72 sm:mt-8 sm:rounded-3xl sm:p-5 sm:text-sm sm:leading-6">
            Demo access is available with <span className="font-semibold text-white">{DEFAULT_DEMO_USER_EMAIL}</span> and password{" "}
            <span className="font-semibold text-white">{DEMO_PASSWORD}</span>, or you can use the demo button below.
          </div>
        </div>
        <div className="order-1 flex items-start sm:items-center md:order-2">
          <div className="w-full">
            <div className="mb-3 md:hidden">
              <Brand compact />
            </div>
            <h2 className="text-xl font-semibold sm:text-3xl">Sign in</h2>
            <p className="mt-1.5 text-sm text-[var(--foreground)]/65 sm:mt-2">
              New here?{" "}
              <Link href="/sign-up" className="text-[var(--accent)]">
                Create an account
              </Link>
            </p>
            <div className="mt-4 sm:mt-7">
              <SignInForm />
            </div>
            <p className="pinly-auth-footer-copy mt-2 text-center text-[11px] leading-4 text-[var(--foreground)]/52 sm:mt-6 sm:text-xs sm:leading-normal">
              Review the current Pinly terms and privacy details below.
            </p>
            <LegalLinks className="pinly-auth-footer-links mt-0.5 justify-center gap-1 text-[11px] leading-4 [&_a]:px-1 [&_a]:py-0.5 sm:mt-2 sm:gap-3 sm:text-xs sm:leading-normal sm:[&_a]:px-2 sm:[&_a]:py-1" />
          </div>
        </div>
      </div>
    </main>
  );
}

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
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-6 rounded-[2rem] border bg-[var(--surface-strong)] p-6 shadow-xl shadow-black/5 md:grid-cols-[1fr_0.92fr] md:p-10">
        <div className="rounded-[1.75rem] bg-[var(--foreground)] p-8 text-white">
          <Brand compact />
          <h1 className="mt-12 font-[var(--font-serif)] text-4xl">Welcome back to your map.</h1>
          <p className="mt-4 max-w-md text-white/72">
            Sign in to revisit your own travel memories and see what your friends have pinned around the world.
          </p>
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/8 p-5 text-sm text-white/72">
            Demo access is available with <span className="font-semibold text-white">{DEFAULT_DEMO_USER_EMAIL}</span> and password{" "}
            <span className="font-semibold text-white">{DEMO_PASSWORD}</span>, or you can use the demo button below.
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-full">
            <h2 className="text-3xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm text-[var(--foreground)]/65">
              New here?{" "}
              <Link href="/sign-up" className="text-[var(--accent)]">
                Create an account
              </Link>
            </p>
            <div className="mt-8">
              <SignInForm />
            </div>
            <p className="mt-6 text-center text-xs text-[var(--foreground)]/52">
              Review the current Pinly terms and privacy details below.
            </p>
            <LegalLinks className="mt-2 justify-center" />
          </div>
        </div>
      </div>
    </main>
  );
}

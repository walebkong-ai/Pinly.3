import Link from "next/link";
import { Globe2, PlusCircle, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { LegalLinks } from "@/components/legal/legal-links";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/map");
  }

  return (
    <main className="pinly-auth-page pinly-centered-page mx-auto flex max-w-5xl items-start px-4 py-2.5 sm:items-center sm:px-6 sm:py-10">
      <div className="pinly-auth-shell grid w-full gap-2.5 rounded-[1.75rem] border bg-[var(--surface-strong)] p-3 shadow-xl shadow-black/5 sm:gap-6 sm:rounded-[2rem] sm:p-6 md:grid-cols-[0.9fr_1.1fr] md:p-10">
        <div className="order-2 flex items-center md:order-1">
          <div className="w-full">
            <Brand compact />
            <h1 className="mt-3.5 font-[var(--font-serif)] text-[1.95rem] leading-tight sm:mt-8 sm:text-4xl">
              Build your personal travel memory map.
            </h1>
            <p className="mt-2.5 text-sm leading-6 text-[var(--foreground)]/68 sm:mt-4">
              Pinly keeps your posts intentional, place-based, and shared according to the visibility settings you choose.
            </p>
            <div className="mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
              {[
                {
                  icon: PlusCircle,
                  label: "Create your first memory",
                  description: "Upload one place that already means something to you."
                },
                {
                  icon: UserPlus,
                  label: "Add a few real friends",
                  description: "Unlock the social map, sharing, and direct messages."
                },
                {
                  icon: Globe2,
                  label: "Land on your map right away",
                  description: "Your account opens into a lightweight first-run map intro."
                }
              ].map(({ icon: Icon, label, description }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-[1.35rem] border bg-[var(--surface-soft)] px-3 py-3 sm:rounded-[1.5rem] sm:px-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-strong)] text-[var(--foreground)] sm:h-9 sm:w-9 sm:rounded-2xl">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--foreground)]/58">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="order-1 rounded-[1.5rem] border bg-[var(--card-strong)] p-3.5 sm:rounded-[1.75rem] sm:p-6 md:order-2">
          <div className="mb-3 md:hidden">
            <Brand compact />
          </div>
          <h2 className="text-xl font-semibold sm:text-3xl">Create account</h2>
          <p className="mt-2 text-sm text-[var(--foreground)]/65">
            Already have one?{" "}
            <Link href="/sign-in" className="text-[var(--accent)]">
              Sign in
            </Link>
          </p>
          <div className="mt-5 sm:mt-7">
            <SignUpForm />
          </div>
          <LegalLinks className="mt-4 justify-center gap-2 border-t pt-3 sm:mt-5 sm:gap-3 sm:pt-4" />
        </div>
      </div>
    </main>
  );
}

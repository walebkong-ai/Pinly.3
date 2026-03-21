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
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-6 rounded-[2rem] border bg-[var(--surface-strong)] p-6 shadow-xl shadow-black/5 md:grid-cols-[0.9fr_1.1fr] md:p-10">
        <div className="flex items-center">
          <div className="w-full">
            <Brand compact />
            <h1 className="mt-10 font-[var(--font-serif)] text-4xl">Build your personal travel memory map.</h1>
            <p className="mt-4 text-sm leading-6 text-[var(--foreground)]/68">
              Pinly keeps your posts intentional, place-based, and private to accepted friends.
            </p>
            <div className="mt-6 space-y-3">
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
                  className="flex items-start gap-3 rounded-[1.5rem] border bg-[var(--surface-soft)] px-4 py-3"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--foreground)]">
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
        <div className="rounded-[1.75rem] border bg-[var(--card-strong)] p-6">
          <h2 className="text-3xl font-semibold">Create account</h2>
          <p className="mt-2 text-sm text-[var(--foreground)]/65">
            Already have one?{" "}
            <Link href="/sign-in" className="text-[var(--accent)]">
              Sign in
            </Link>
          </p>
          <div className="mt-8">
            <SignUpForm />
          </div>
          <LegalLinks className="mt-6 justify-center border-t pt-4" />
        </div>
      </div>
    </main>
  );
}

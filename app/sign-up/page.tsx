import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { SignUpForm } from "@/components/auth/sign-up-form";

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
        </div>
      </div>
    </main>
  );
}

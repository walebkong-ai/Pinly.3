import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { DeleteAccountCard } from "@/components/account/delete-account-card";
import { LegalLinks } from "@/components/legal/legal-links";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { isReservedDemoEmail } from "@/lib/demo-config";

export const metadata: Metadata = {
  title: "Delete Account | Pinly",
  description: "Delete your Pinly account and review what data is removed."
};

type DeleteAccountPageProps = {
  searchParams: Promise<{
    deleted?: string;
  }>;
};

export default async function DeleteAccountPage({ searchParams }: DeleteAccountPageProps) {
  const session = await auth();
  const params = await searchParams;
  const showDeletedState = params.deleted === "1";

  if (showDeletedState && session?.user?.id) {
    redirect("/map");
  }

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          username: true,
          email: true
        }
      })
    : null;

  const isDemoAccount = user ? isReservedDemoEmail(user.email) : false;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-[2rem] border bg-[var(--surface-strong)] p-5 shadow-xl shadow-black/5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <Brand compact />
          <LegalLinks />
        </div>

        <section className="mt-8 rounded-[1.75rem] border bg-[var(--card-strong)] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/46">Account deletion</p>
          <h1 className="mt-2 font-[var(--font-serif)] text-3xl sm:text-4xl">Delete your Pinly account</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--foreground)]/68">
            This page is Pinly&apos;s public account deletion entry point. If you are signed in, you can run the same
            permanent deletion flow used inside Settings. If you are not signed in, sign in first and come right back here.
          </p>
        </section>

        {showDeletedState ? (
          <section className="mt-5 rounded-[1.75rem] border border-[rgba(24,85,56,0.16)] bg-[rgba(24,85,56,0.07)] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(24,85,56,0.12)] text-[var(--accent)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">Your account has been deleted</p>
                <p className="mt-1 text-sm leading-6 text-[var(--foreground)]/68">
                  Pinly removed the account and signed this browser session out. If you ever return, you would need to
                  create a new account from scratch.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button className="w-full sm:w-auto">Create a new account</Button>
              </Link>
              <Link href="/">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Back to Pinly
                </Button>
              </Link>
            </div>
          </section>
        ) : user ? (
          <section className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--foreground)]/8 text-[var(--foreground)]">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Signed in as @{user.username}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--foreground)]/64">
                    Continue only if you want to permanently remove this account from Pinly.
                  </p>
                </div>
              </div>
            </div>

            <DeleteAccountCard username={user.username} isDemoAccount={isDemoAccount} variant="page" />
          </section>
        ) : (
          <section className="mt-5 rounded-[1.75rem] border bg-[var(--surface-soft)] p-5 sm:p-6">
            <p className="text-sm font-semibold">Sign in to continue</p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/68">
              Sign in with the account you want to remove. Once authenticated, this page will show the same permanent
              deletion flow that is available in the app at Settings.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in?callbackUrl=/delete-account">
                <Button className="w-full sm:w-auto">Sign in</Button>
              </Link>
              <Link href="/privacy">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Review privacy policy
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

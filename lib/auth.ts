import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials, ensureGoogleUser, LegalAcceptanceRequiredError } from "@/lib/auth-helpers";
import { readPendingLegalConsent } from "@/lib/legal";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    authorize: async (credentials) => authorizeCredentials(prisma, credentials)
  })
];

if (googleConfigured) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
    })
  );
}

async function syncTokenWithCurrentUser(token: Record<string, unknown>) {
  const tokenUserId =
    typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : null;

  if (!tokenUserId) {
    return null;
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: tokenUserId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true
      }
    });

    if (!currentUser) {
      return null;
    }

    token.sub = currentUser.id;
    token.id = currentUser.id;
    token.email = currentUser.email;
    token.name = currentUser.name;
    token.username = currentUser.username;
    token.avatarUrl = currentUser.avatarUrl;

    return token;
  } catch (error) {
    console.error("Failed to verify auth session against the database:", error);
    return token;
  }
}

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt" as const
  },
  pages: {
    signIn: "/sign-in"
  },
  providers,
  callbacks: {
    signIn: async ({ user, account }: any) => {
      if (account?.provider !== "google") {
        return true;
      }

      if (!user?.email) {
        return false;
      }

      try {
        const legalAcceptance = await readPendingLegalConsent();
        const ensuredUser = await ensureGoogleUser(prisma, {
          email: user.email,
          name: user.name,
          avatarUrl: user.image ?? user.avatarUrl
        }, legalAcceptance ?? undefined);

        user.id = ensuredUser.id;
        user.username = ensuredUser.username;
        user.avatarUrl = ensuredUser.avatarUrl;
        user.name = ensuredUser.name;
        user.email = ensuredUser.email;
        return true;
      } catch (error) {
        if (error instanceof LegalAcceptanceRequiredError) {
          return "/sign-up?legal=required";
        }

        console.error(error);
        return false;
      }
    },
    jwt: async ({ token, user, trigger, session }: any) => {
      if (user) {
        token.id = user.id ?? token.id ?? token.sub;
        token.username = user.username ?? token.username ?? "traveler";
        token.avatarUrl = user.avatarUrl ?? user.image ?? token.avatarUrl ?? null;
        token.email = user.email ?? token.email ?? null;
        token.name = user.name ?? token.name ?? null;
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.username === "string") {
          token.username = session.user.username;
        }

        if ("avatarUrl" in session.user) {
          token.avatarUrl = session.user.avatarUrl ?? null;
        }
      }

      return syncTokenWithCurrentUser(token);
    },
    session: async ({ session, token }: any) => {
      if (typeof token?.id !== "string" && typeof token?.sub !== "string") {
        return null;
      }

      if (session.user) {
        session.user.id =
          typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : "";
        session.user.username = typeof token.username === "string" ? token.username : "traveler";
        session.user.avatarUrl = token.avatarUrl ?? null;
      }

      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(authConfig);

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

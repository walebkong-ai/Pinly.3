import NextAuth, { type NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { logLocalAuthDebug, logLocalAuthError, logLocalAuthLoggerError } from "@/lib/auth-debug";
import { resolveAuthRedirectUrl } from "@/lib/auth-local";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials, ensureSocialAuthUser, LegalAcceptanceRequiredError } from "@/lib/auth-helpers";
import { readPendingLegalConsent } from "@/lib/legal";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const appleConfigured = Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET);
const googleAllowed = googleConfigured && (process.env.NODE_ENV !== "production" || appleConfigured);

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    authorize: async (credentials) => authorizeCredentials(prisma, credentials)
  })
];

if (appleConfigured) {
  providers.push(
    Apple({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string
    })
  );
}

if (googleAllowed) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
    })
  );
}

async function syncTokenWithCurrentUser(token: any): Promise<any> {
  const tokenUserId =
    typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : null;

  if (!tokenUserId) {
    logLocalAuthDebug("jwt.sync_skipped_missing_user");
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
      logLocalAuthDebug("jwt.sync_missing_database_user", {
        userId: tokenUserId
      });
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
    logLocalAuthError("jwt.sync_failed", error, {
      userId: tokenUserId
    });
    return token;
  }
}

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  logger: {
    error: (error: Error) => {
      logLocalAuthLoggerError("authjs.error", error, {
        requestUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL || undefined
      });
      console.error(error);
    }
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt" as const
  },
  pages: {
    signIn: "/sign-in"
  },
  providers,
  callbacks: {
    redirect: async ({ url, baseUrl }: { url: string; baseUrl: string }) => {
      const redirectUrl = resolveAuthRedirectUrl(url, baseUrl);
      logLocalAuthDebug("redirect.resolved", {
        url,
        baseUrl,
        redirectUrl
      });
      return redirectUrl;
    },
    signIn: async ({ user, account }: any) => {
      logLocalAuthDebug("sign_in.callback", {
        provider: account?.provider ?? null,
        userId: user?.id ?? null,
        email: user?.email ?? null
      });

      if (account?.provider !== "google" && account?.provider !== "apple") {
        return true;
      }

      if (!user?.email) {
        return false;
      }

      try {
        const legalAcceptance = await readPendingLegalConsent();
        const ensuredUser = await ensureSocialAuthUser(prisma, {
          email: user.email,
          name: user.name,
          avatarUrl: user.image ?? user.avatarUrl
        }, legalAcceptance ?? undefined);

        user.id = ensuredUser.id;
        user.username = ensuredUser.username;
        user.avatarUrl = ensuredUser.avatarUrl;
        user.name = ensuredUser.name;
        user.email = ensuredUser.email;
        logLocalAuthDebug("social.sign_in.success", {
          provider: account.provider,
          userId: ensuredUser.id,
          email: ensuredUser.email
        });
        return true;
      } catch (error) {
        if (error instanceof LegalAcceptanceRequiredError) {
          logLocalAuthDebug("social.sign_in.legal_required", {
            provider: account.provider,
            email: user.email
          });
          return "/sign-up?legal=required";
        }

        logLocalAuthError("social.sign_in.failed", error, {
          provider: account?.provider ?? null,
          email: user?.email ?? null
        });
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

      const nextToken = await syncTokenWithCurrentUser(token);
      logLocalAuthDebug("jwt.issued", {
        trigger: trigger ?? "default",
        userId:
          typeof nextToken?.id === "string"
            ? nextToken.id
            : typeof nextToken?.sub === "string"
              ? nextToken.sub
              : null,
        email: typeof nextToken?.email === "string" ? nextToken.email : null,
        hadUserPayload: Boolean(user)
      });
      return nextToken;
    },
    session: async ({ session, token }: any) => {
      if (typeof token?.id !== "string" && typeof token?.sub !== "string") {
        logLocalAuthDebug("session.missing_token_user");
        return null;
      }

      if (session.user) {
        session.user.id =
          typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : "";
        session.user.username = typeof token.username === "string" ? token.username : "traveler";
        session.user.avatarUrl = token.avatarUrl ?? null;
      }

      logLocalAuthDebug("session.ready", {
        userId: session.user?.id ?? null,
        username: session.user?.username ?? null
      });
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

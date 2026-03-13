import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials, ensureGoogleUser } from "@/lib/auth-helpers";

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
        const ensuredUser = await ensureGoogleUser(prisma, {
          email: user.email,
          name: user.name,
          avatarUrl: user.image ?? user.avatarUrl
        });

        user.id = ensuredUser.id;
        user.username = ensuredUser.username;
        user.avatarUrl = ensuredUser.avatarUrl;
        user.name = ensuredUser.name;
        user.email = ensuredUser.email;
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    jwt: async ({ token, user }: any) => {
      if (user) {
        token.id = user.id ?? token.id ?? token.sub;
        token.username = user.username ?? token.username ?? "traveler";
        token.avatarUrl = user.avatarUrl ?? user.image ?? token.avatarUrl ?? null;
      }

      return token;
    },
    session: async ({ session, token }: any) => {
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

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

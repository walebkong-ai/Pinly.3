import { getBundledDemoAvatarUrl } from "@/lib/demo-media";
import { normalizeProfileImageUrl } from "@/lib/media-url";

export const DEMO_PASSWORD = "password123";

export const DEMO_USERS = [
  {
    key: "avery",
    name: "Avery Chen",
    preferredUsername: "avery",
    email: "avery@pinly.demo"
  },
  {
    key: "maya",
    name: "Maya Singh",
    preferredUsername: "maya",
    email: "maya@pinly.demo"
  },
  {
    key: "noah",
    name: "Noah Brooks",
    preferredUsername: "noah",
    email: "noah@pinly.demo"
  },
  {
    key: "elena",
    name: "Elena Garcia",
    preferredUsername: "elena",
    email: "elena@pinly.demo"
  },
  {
    key: "leo",
    name: "Leo Martin",
    preferredUsername: "leo",
    email: "leo@pinly.demo"
  }
] as const;

export type DemoUserKey = (typeof DEMO_USERS)[number]["key"];

export const DEFAULT_DEMO_USER = DEMO_USERS[0];
export const DEFAULT_DEMO_USER_EMAIL = DEFAULT_DEMO_USER.email;

const demoEmails = new Set<string>(DEMO_USERS.map((user) => user.email));

export function getDemoAvatarUrl(seed: string) {
  const configuredAvatarUrl = normalizeProfileImageUrl(process.env.PINLY_DEMO_AVATAR_URL ?? null);

  if (configuredAvatarUrl) {
    return configuredAvatarUrl;
  }

  return getBundledDemoAvatarUrl(seed);
}

export function isReservedDemoEmail(email: string) {
  return demoEmails.has(email.trim().toLowerCase());
}

export function isDemoCredentials(email: string, password: string) {
  return isReservedDemoEmail(email) && password === DEMO_PASSWORD;
}

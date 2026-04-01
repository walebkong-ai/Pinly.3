import React from "react";
import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppShell,
  NOTIFICATION_BUTTON_ACTIVE_BACKGROUND,
  NOTIFICATION_BUTTON_ACTIVE_ICON,
  isNavActive
} from "@/components/app/app-shell";

const mockedUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockedUsePathname()
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/components/brand", () => ({
  Brand: () => <span>Brand</span>
}));

vi.mock("@/components/app/screen-transition", () => ({
  ScreenTransition: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock("@/components/push/native-push-manager", () => ({
  NativePushManager: () => null
}));

vi.mock("@/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Sign out</button>
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>
}));

describe("AppShell notification toggle", () => {
  const user = {
    id: "user-1",
    name: "Jordan Example",
    username: "jordan",
    avatarUrl: null
  };

  test("treats the notifications route as active", () => {
    expect(isNavActive("/notifications", "/notifications")).toBe(true);
    expect(isNavActive("/notifications/thread", "/notifications")).toBe(true);
    expect(isNavActive("/feed", "/notifications")).toBe(false);
  });

  test("applies the exact active green button and cream bell icon treatment on the notifications route", () => {
    mockedUsePathname.mockReturnValue("/notifications");

    const html = renderToStaticMarkup(
      <AppShell user={user}>
        <div>Notifications page</div>
      </AppShell>
    );

    expect(html).toContain('href="/notifications"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(`background-color:${NOTIFICATION_BUTTON_ACTIVE_BACKGROUND}`);
    expect(html).toContain(`border-color:${NOTIFICATION_BUTTON_ACTIVE_BACKGROUND}`);
    expect(html).toContain(`color:${NOTIFICATION_BUTTON_ACTIVE_ICON}`);
    expect(html).not.toContain(`background-color:${NOTIFICATION_BUTTON_ACTIVE_ICON}`);
  });

  test("drops back to the inactive notification styling when another route is open", () => {
    mockedUsePathname.mockReturnValue("/feed");

    const html = renderToStaticMarkup(
      <AppShell user={user}>
        <div>Feed page</div>
      </AppShell>
    );

    expect(html).toContain('href="/notifications" aria-label="Notifications"');
    expect(html).not.toContain('href="/notifications" aria-label="Notifications" aria-current="page"');
    expect(html).not.toContain(`color:${NOTIFICATION_BUTTON_ACTIVE_ICON}`);
    expect(html).not.toContain(`border-color:${NOTIFICATION_BUTTON_ACTIVE_BACKGROUND}`);
  });

  test("marks header, content, and bottom navigation as isolated layout regions", () => {
    mockedUsePathname.mockReturnValue("/map");

    const html = renderToStaticMarkup(
      <AppShell user={user}>
        <div>Map page</div>
      </AppShell>
    );

    expect(html).toContain('data-pinly-app-shell="true"');
    expect(html).toContain('data-pinly-layout-region="header"');
    expect(html).toContain('data-pinly-layout-region="content"');
    expect(html).toContain('data-pinly-layout-region="bottom-nav"');
  });
});

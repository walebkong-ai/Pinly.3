import React from "react";
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileLink } from "@/components/profile/profile-link";

describe("ProfileLink", () => {
  test("renders a profile anchor by default", () => {
    const html = renderToStaticMarkup(
      <ProfileLink username="jordan">
        <span className="identity">Jordan</span>
      </ProfileLink>
    );

    expect(html).toContain('href="/profile/jordan"');
    expect(html).toContain("Open @jordan");
  });

  test("can disable profile navigation and preserve child styling", () => {
    const html = renderToStaticMarkup(
      <ProfileLink username="jordan" className="rounded-xl px-1" disableProfileNavigation>
        <span className="identity">Jordan</span>
      </ProfileLink>
    );

    expect(html).not.toContain("href=");
    expect(html).toContain('class="identity rounded-xl px-1"');
  });

  test("wraps multi-node children when navigation is disabled so selection rows keep their layout", () => {
    const html = renderToStaticMarkup(
      <ProfileLink username="jordan" className="flex items-center gap-3" disableProfileNavigation>
        <span className="avatar">J</span>
        <span className="identity">Jordan</span>
      </ProfileLink>
    );

    expect(html).not.toContain("href=");
    expect(html).toContain('class="flex items-center gap-3"');
    expect(html).toContain('class="avatar"');
    expect(html).toContain('class="identity"');
  });
});

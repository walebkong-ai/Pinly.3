import React from "react";
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CountryFlag } from "@/components/ui/country-flag";

describe("CountryFlag", () => {
  test("renders a flag emoji and canonical text for mappable countries", () => {
    const markup = renderToStaticMarkup(<CountryFlag country="NZ" />);

    expect(markup).toContain("🇳🇿");
    expect(markup).toContain("New Zealand");
    expect(markup).toContain("aria-hidden=\"true\"");
  });

  test("renders readable text only for unknown countries", () => {
    const markup = renderToStaticMarkup(<CountryFlag country="Atlantis" />);

    expect(markup).toContain("Atlantis");
    expect(markup).not.toContain("aria-hidden=\"true\"");
  });
});

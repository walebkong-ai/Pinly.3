import { describe, expect, test } from "vitest";
import { normalizeCountryForStorage, resolveCountry } from "@/lib/country-flags";

describe("country flag helpers", () => {
  test("maps full country names to a canonical display name and emoji flag", () => {
    expect(resolveCountry("Canada")).toEqual({
      code: "CA",
      name: "Canada",
      flag: "🇨🇦"
    });
    expect(resolveCountry("Japan")).toEqual({
      code: "JP",
      name: "Japan",
      flag: "🇯🇵"
    });
  });

  test("maps ISO country codes to canonical country names", () => {
    expect(resolveCountry("NZ")).toEqual({
      code: "NZ",
      name: "New Zealand",
      flag: "🇳🇿"
    });
    expect(normalizeCountryForStorage("nz")).toBe("New Zealand");
  });

  test("normalizes whitespace, casing, punctuation, and diacritics", () => {
    expect(resolveCountry("  united   states   of america ")).toMatchObject({
      code: "US",
      name: "United States"
    });
    expect(resolveCountry("Réunion")).toMatchObject({
      code: "RE",
      name: "Reunion"
    });
  });

  test("supports common country aliases", () => {
    expect(resolveCountry("USA")).toMatchObject({
      code: "US",
      name: "United States"
    });
    expect(resolveCountry("South Korea")).toMatchObject({
      code: "KR",
      name: "South Korea"
    });
  });

  test("falls back gracefully for unknown countries", () => {
    expect(resolveCountry("Atlantis")).toEqual({
      code: null,
      name: "Atlantis",
      flag: null
    });
    expect(normalizeCountryForStorage(" Atlantis ")).toBe("Atlantis");
  });
});

import { describe, expect, test } from "vitest";
import { normalizeSearchText, rankBySearch, scoreWeightedSearch } from "@/lib/search";

describe("search helpers", () => {
  test("normalizes casing, spaces, and diacritics", () => {
    expect(normalizeSearchText("  São   Paulo  ")).toBe("sao paulo");
  });

  test("ranks exact and prefix matches ahead of weaker contains matches", () => {
    const ranked = rankBySearch(
      [
        { id: "contains", label: "Hidden Montreal Memories" },
        { id: "prefix", label: "Montreal summer" },
        { id: "exact", label: "Montreal" }
      ],
      "montreal",
      (item) => [{ value: item.label, weight: 1 }]
    );

    expect(ranked.map((item) => item.id)).toEqual(["exact", "prefix", "contains"]);
  });

  test("supports multi-term matching across different fields", () => {
    const score = scoreWeightedSearch(
      [
        { value: "Tokyo", weight: 4.2 },
        { value: "Japan", weight: 3.6 }
      ],
      "tokyo japan"
    );

    expect(score).toBeGreaterThan(0);
  });
});

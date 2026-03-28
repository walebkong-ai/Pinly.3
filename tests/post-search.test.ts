import { describe, expect, test } from "vitest";
import { buildPostSearchTermWhere, getPostSearchFields } from "@/lib/post-search";
import { rankBySearch } from "@/lib/search";

describe("post search helpers", () => {
  test("search clauses include tagged friends by name and username", () => {
    expect(buildPostSearchTermWhere("elena")).toEqual({
      OR: [
        { placeName: { contains: "elena", mode: "insensitive" } },
        { city: { contains: "elena", mode: "insensitive" } },
        { country: { contains: "elena", mode: "insensitive" } },
        { caption: { contains: "elena", mode: "insensitive" } },
        { user: { name: { contains: "elena", mode: "insensitive" } } },
        { user: { username: { contains: "elena", mode: "insensitive" } } },
        {
          visitedWith: {
            some: {
              user: {
                name: { contains: "elena", mode: "insensitive" }
              }
            }
          }
        },
        {
          visitedWith: {
            some: {
              user: {
                username: { contains: "elena", mode: "insensitive" }
              }
            }
          }
        }
      ]
    });
  });

  test("ranking considers tagged friends alongside owner and place metadata", () => {
    const ranked = rankBySearch(
      [
        {
          id: "tagged-memory",
          placeName: "Toronto Public Library - City Hall",
          city: "Toronto",
          country: "Canada",
          caption: "Tag flow verification memory",
          user: { name: "Avery Chen", username: "avery" },
          visitedWith: [{ name: "Elena Garcia", username: "elena" }]
        },
        {
          id: "other-memory",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          caption: "Harbor walk",
          user: { name: "Avery Chen", username: "avery" },
          visitedWith: []
        }
      ],
      "elena toronto",
      getPostSearchFields
    );

    expect(ranked.map((post) => post.id)).toEqual(["tagged-memory"]);
  });
});

import type { MapCategory, PostSummary } from "@/types/app";

export const MAP_CATEGORY_OPTIONS: Array<{ value: MapCategory; label: string }> = [
  { value: "photo", label: "Photos" },
  { value: "video", label: "Videos" },
  { value: "food", label: "Food" },
  { value: "nature", label: "Nature" },
  { value: "landmark", label: "Landmarks" },
  { value: "neighborhood", label: "Neighborhoods" }
];

const categoryKeywordMap: Record<Exclude<MapCategory, "photo" | "video">, string[]> = {
  food: ["cafe", "coffee", "espresso", "restaurant", "dinner", "lunch", "breakfast", "bar", "market", "bagel"],
  nature: ["park", "garden", "grove", "meadow", "ocean", "beach", "lagoon", "harbour", "harbor", "canal", "river", "bamboo"],
  landmark: ["palace", "fountain", "plaza", "square", "port", "quay", "bridge", "museum", "arts", "fine arts", "waterfront"],
  neighborhood: ["road", "district", "crossing", "trastevere", "fitzroy", "dumbo", "historico", "old port", "mission"]
};

export function derivePostCategories(post: PostSummary): MapCategory[] {
  const categories = new Set<MapCategory>();
  const haystack = `${post.placeName} ${post.caption} ${post.city} ${post.country}`.toLowerCase();

  categories.add(post.mediaType === "VIDEO" ? "video" : "photo");

  for (const [category, keywords] of Object.entries(categoryKeywordMap) as Array<[Exclude<MapCategory, "photo" | "video">, string[]]>) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      categories.add(category);
    }
  }

  return [...categories];
}

export function filterPostsByCategories(posts: PostSummary[], categories: MapCategory[]) {
  if (!categories.length) {
    return posts;
  }

  return posts.filter((post) => {
    const derived = derivePostCategories(post);
    return categories.some((category) => derived.includes(category));
  });
}

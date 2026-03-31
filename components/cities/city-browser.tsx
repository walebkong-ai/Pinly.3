"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { PostSummary } from "@/types/app";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post/post-card";
import { ProfileLink } from "@/components/profile/profile-link";

type CityResult = {
  city: string;
  country: string;
  friendCount: number;
  postCount: number;
  center: { latitude: number; longitude: number };
  visitors: Array<{ id: string; name: string; username: string; avatarUrl: string | null }>;
  recentTrips: PostSummary[];
  posts: PostSummary[];
};

export function CityBrowser({ showLikeCounts = true }: { showLikeCounts?: boolean }) {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [result, setResult] = useState<CityResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSearch() {
    if (city.trim().length < 2) {
      toast.error("Enter a city to search.");
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({ city });

    if (country.trim()) {
      params.set("country", country);
    }

    const response = await fetch(`/api/posts/city?${params.toString()}`);
    setLoading(false);

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Could not load city.");
      return;
    }

    const data = await response.json();
    setResult(data);
  }

  return (
    <div className="pinly-content-shell pinly-screen-stack">
      <section className="glass-panel pinly-panel">
        <p className="pinly-eyebrow">City discovery</p>
        <h1 className="pinly-display-title">Browse places through your friends</h1>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" className="pl-11" />
          </div>
          <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country (optional)" />
          <Button onClick={onSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </section>

      {result && (
        <section className="glass-panel pinly-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="pinly-eyebrow">Results</p>
              <h2 className="pinly-display-title truncate">
                {result.city}, {result.country}
              </h2>
            </div>
            <div className="flex shrink-0 gap-3 text-sm text-[var(--foreground)]/66">
              <span>{result.postCount} posts</span>
              <span>{result.friendCount} friends</span>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
              <p className="text-sm font-semibold">Who visited</p>
              <div className="mt-3 space-y-2">
                {result.visitors.map((visitor) => (
                  <ProfileLink
                    key={visitor.id}
                    username={visitor.username}
                    className="flex min-w-0 items-center gap-1 rounded-xl px-2 py-1 -mx-2 text-sm text-[var(--foreground)]/68 transition hover:bg-[var(--surface-strong)]"
                  >
                    <span className="truncate">{visitor.name}</span>
                    <span className="max-w-[50%] shrink-0 truncate text-[var(--foreground)]/45">@{visitor.username}</span>
                  </ProfileLink>
                ))}
              </div>
            </div>
            <div className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4 md:col-span-1 xl:col-span-2">
              <p className="text-sm font-semibold">Recent trips</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {result.recentTrips.map((trip) => (
                  <PostCard key={trip.id} post={trip} compact showLikeCounts={showLikeCounts} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.posts.map((post) => (
              <PostCard key={post.id} post={post} showLikeCounts={showLikeCounts} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, LoaderCircle, MapPin, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlaceSearchResult } from "@/types/app";

type UploadState = {
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  thumbnailUrl: string | null;
} | null;

const DynamicLocationPicker = dynamic(
  () => import("@/components/create/location-picker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-[320px] rounded-[1.75rem] border bg-white/60" />
  }
);

export function CreatePostForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [visitedAt, setVisitedAt] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const deferredLocationQuery = useDeferredValue(locationQuery);

  useEffect(() => {
    let ignore = false;

    async function searchPlaces() {
      if (deferredLocationQuery.trim().length < 2) {
        setPlaceResults([]);
        return;
      }

      setSearchingPlaces(true);
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(deferredLocationQuery.trim())}`);
      setSearchingPlaces(false);

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (!ignore) {
        setPlaceResults(data.places ?? []);
      }
    }

    void searchPlaces();

    return () => {
      ignore = true;
    };
  }, [deferredLocationQuery]);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setUploading(true);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData
    });

    setUploading(false);

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Upload failed.");
      return;
    }

    const data = await response.json();
    setUploadState(data);
    toast.success("Media uploaded.");
  }

  function applyPlaceResult(place: PlaceSearchResult) {
    setPlaceName(place.placeName);
    setCity(place.city);
    setCountry(place.country);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setLocationQuery(place.displayName);
    setPlaceResults([]);
  }

  async function onSubmit() {
    if (!uploadState) {
      toast.error("Upload a photo or video first.");
      return;
    }

    if (!caption.trim() || !placeName.trim() || !city.trim() || !country.trim() || !visitedAt) {
      toast.error("Fill in the memory details before publishing.");
      return;
    }

    if (latitude === null || longitude === null) {
      toast.error("Choose a place by tapping the map or searching for one.");
      return;
    }

    setSubmitting(true);

    const payload = {
      ...uploadState,
      caption,
      placeName,
      city,
      country,
      latitude,
      longitude,
      visitedAt: new Date(visitedAt).toISOString()
    };

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Could not create post.");
      return;
    }

    toast.success("Your memory is pinned.");
    router.push("/map");
    router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="glass-panel rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Step 1</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-4xl">Upload your moment</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]/66">
          Add a photo or video from a place you intentionally want to remember. No background tracking, ever.
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-6 flex h-72 w-full flex-col items-center justify-center rounded-[2rem] border border-dashed bg-white/60 text-center"
        >
          {uploading ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-[var(--accent)]" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-[var(--accent)]" />
              <p className="mt-4 font-medium">{uploadState ? "Replace media" : "Choose image or video"}</p>
              <p className="mt-2 max-w-xs text-sm text-[var(--foreground)]/55">Upload a photo or a short video for this memory moment.</p>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void uploadFile(file);
            }
          }}
        />
        {uploadState && (
          <div className="mt-4 rounded-3xl border bg-white/72 p-4 text-sm text-[var(--foreground)]/66">
            Ready to post: <span className="font-medium text-[var(--foreground)]">{uploadState.mediaType.toLowerCase()}</span>
          </div>
        )}
      </section>

      <section className="glass-panel rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Step 2</p>
        <h2 className="mt-2 font-[var(--font-serif)] text-4xl">Choose the place</h2>
        <div className="mt-6 space-y-4">
          <div className="rounded-[1.75rem] border bg-white/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Search className="h-4 w-4 text-[var(--accent)]" />
              Search for a place
            </div>
            <div className="relative mt-3">
              <Input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Search cities, landmarks, neighborhoods"
              />
              {searchingPlaces && <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--accent)]" />}
            </div>
            {!!placeResults.length && (
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                {placeResults.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => applyPlaceResult(place)}
                    className="block w-full rounded-3xl border bg-white/72 px-4 py-3 text-left transition hover:bg-white"
                  >
                    <p className="text-sm font-medium">{place.placeName}</p>
                    <p className="mt-1 text-xs text-[var(--foreground)]/55">{place.displayName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border bg-white/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Crosshair className="h-4 w-4 text-[var(--accent)]" />
              Or tap the map to drop the memory exactly where it happened
            </div>
            <div className="mt-4 overflow-hidden rounded-[1.75rem]">
              <DynamicLocationPicker
                position={latitude !== null && longitude !== null ? { latitude, longitude } : null}
                onSelect={(coordinates) => {
                  setLatitude(coordinates.latitude);
                  setLongitude(coordinates.longitude);
                }}
              />
            </div>
          </div>

          <Textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="What made this place feel special?"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input value={placeName} onChange={(event) => setPlaceName(event.target.value)} placeholder="Place name" required />
            <Input value={visitedAt} onChange={(event) => setVisitedAt(event.target.value)} type="date" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" required />
            <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" required />
          </div>

          <details className="rounded-3xl border bg-white/65 p-4 text-sm text-[var(--foreground)]/65">
            <summary className="cursor-pointer font-medium text-[var(--foreground)]">Advanced coordinates</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                value={latitude ?? ""}
                onChange={(event) => setLatitude(event.target.value ? Number(event.target.value) : null)}
                type="number"
                step="0.000001"
                placeholder="Latitude"
              />
              <Input
                value={longitude ?? ""}
                onChange={(event) => setLongitude(event.target.value ? Number(event.target.value) : null)}
                type="number"
                step="0.000001"
                placeholder="Longitude"
              />
            </div>
          </details>

          <div className="rounded-3xl border bg-white/65 p-4 text-sm text-[var(--foreground)]/65">
            <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
              <MapPin className="h-4 w-4 text-[var(--accent)]" />
              Intentional place-based posting only
            </div>
            <p className="mt-2">Search for a place, tap the map, or fine-tune with advanced coordinates. No live location is used.</p>
          </div>
          <Button type="button" onClick={onSubmit} className="w-full" disabled={submitting || uploading}>
            {submitting ? "Saving pin..." : "Publish memory"}
          </Button>
        </div>
      </section>
    </div>
  );
}

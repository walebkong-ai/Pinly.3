"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, LoaderCircle, MapPin, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VisitedWithPicker } from "@/components/create/visited-with-picker";
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
    loading: () => <div className="h-[320px] rounded-[1.75rem] border bg-[var(--surface-soft)]" />
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
  const [gettingLocation, setGettingLocation] = useState(false);
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const locationAbortRef = useRef<AbortController | null>(null);
  const ignoreNextSearchRef = useRef(false);

  useEffect(() => {
    return () => {
      if (locationAbortRef.current) {
        locationAbortRef.current.abort();
      }
    };
  }, []);

  // Debounced place search — 300ms delay, cancels in-flight requests
  const searchPlaces = useCallback(async (q: string, signal: AbortSignal) => {
    if (q.trim().length < 2) {
      setPlaceResults([]);
      setSearchingPlaces(false);
      return;
    }

    setSearchingPlaces(true);
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(q.trim())}`, { signal });
      if (signal.aborted) return;
      if (!response.ok) {
        setSearchingPlaces(false);
        return;
      }
      const data = await response.json();
      if (!signal.aborted) {
        setPlaceResults(data.places ?? []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      if (!signal.aborted) setSearchingPlaces(false);
    }
  }, []);

  useEffect(() => {
    // Clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    // Abort previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (locationQuery.trim().length < 2) {
      setPlaceResults([]);
      setSearchingPlaces(false);
      return;
    }

    if (ignoreNextSearchRef.current) {
      ignoreNextSearchRef.current = false;
      setPlaceResults([]);
      setSearchingPlaces(false);
      return;
    }

    // Show searching indicator immediately for responsiveness
    setSearchingPlaces(true);

    const controller = new AbortController();
    abortRef.current = controller;

    searchTimerRef.current = setTimeout(() => {
      void searchPlaces(locationQuery, controller.signal);
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      controller.abort();
    };
  }, [locationQuery, searchPlaces]);

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
    ignoreNextSearchRef.current = true;
    setLocationQuery(place.displayName);
    setPlaceResults([]);
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support device location");
      return;
    }

    if (locationAbortRef.current) {
      locationAbortRef.current.abort();
    }
    const controller = new AbortController();
    locationAbortRef.current = controller;

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (controller.signal.aborted) return;
        
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        
        try {
          const res = await fetch(`/api/places/reverse?lat=${latitude}&lon=${longitude}`, {
            signal: controller.signal
          });
          if (res.ok && !controller.signal.aborted) {
            const data = await res.json();
            if (data.place && !controller.signal.aborted) {
              setPlaceName(data.place.placeName);
              setCity(data.place.city);
              setCountry(data.place.country);
              ignoreNextSearchRef.current = true;
              setLocationQuery(data.place.placeName);
            }
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          // Fall back gracefully if reverse geocoding fails
        }
        
        if (!controller.signal.aborted) {
          toast.success("Location acquired");
          setGettingLocation(false);
        }
      },
      (error) => {
        if (controller.signal.aborted) return;
        
        setGettingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location permission was denied");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error("Could not get your current location");
        } else if (error.code === error.TIMEOUT) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("An unknown error occurred getting location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      visitedAt: new Date(visitedAt).toISOString(),
      taggedUserIds
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
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Step 1</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-4xl">Upload your moment</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]/66">
          Add a photo or video from a place you intentionally want to remember. No background tracking, ever.
        </p>
        {/* Hidden file input — always mounted so fileRef.current.click() works from both the dashed area and the Replace button */}
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
            // Reset input so re-selecting same file triggers onChange again
            event.target.value = "";
          }}
        />
        {/* Upload / Preview area */}
        {uploading ? (
          <div className="mt-6 flex h-64 w-full flex-col items-center justify-center rounded-[2rem] border border-dashed bg-[var(--surface-soft)]">
            <LoaderCircle className="h-8 w-8 animate-spin text-[var(--accent)]" />
            <p className="mt-3 text-sm text-[var(--foreground)]/55">Uploading…</p>
          </div>
        ) : uploadState ? (
          <div className="relative mt-6 overflow-hidden rounded-[2rem]">
            {uploadState.mediaType === "VIDEO" ? (
              <video
                src={uploadState.mediaUrl}
                poster={uploadState.thumbnailUrl ?? undefined}
                controls
                playsInline
                className="max-h-72 w-full rounded-[2rem] object-cover"
              />
            ) : (
              <img
                src={uploadState.mediaUrl}
                alt="Upload preview"
                className="max-h-72 w-full rounded-[2rem] object-cover"
              />
            )}
            {/* Remove button — clears preview and returns to upload picker */}
            <button
              type="button"
              onClick={() => setUploadState(null)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
              aria-label="Remove media"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Replace button — opens file picker to swap media */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
            >
              <Upload className="h-3.5 w-3.5" />
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-6 flex h-64 w-full flex-col items-center justify-center rounded-[2rem] border border-dashed bg-[var(--surface-soft)] text-center transition hover:bg-[var(--surface-strong)]"
          >
            <Upload className="h-8 w-8 text-[var(--accent)]" />
            <p className="mt-4 font-medium">Choose image or video</p>
            <p className="mt-2 max-w-xs text-sm text-[var(--foreground)]/55">Upload a photo or a short video for this memory moment.</p>
          </button>
        )}
      </section>

      <section className="glass-panel rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Step 2</p>
        <h2 className="mt-2 font-[var(--font-serif)] text-4xl">Choose the place</h2>
        <div className="mt-6 space-y-4">
          <div className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Search className="h-4 w-4 text-[var(--map-accent)]" />
              Search for a place
            </div>
            <div className="relative mt-3">
              <Input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Search cities, landmarks, neighborhoods"
              />
              {searchingPlaces && <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--map-accent)]" />}
            </div>
            {!!placeResults.length && (
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                {placeResults.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => applyPlaceResult(place)}
                    className="block w-full rounded-3xl border bg-[var(--surface-strong)] px-4 py-3 text-left transition hover:bg-[var(--card-strong)]"
                  >
                    <p className="text-sm font-medium">{place.placeName}</p>
                    <p className="mt-1 text-xs text-[var(--foreground)]/55">{place.displayName}</p>
                  </button>
                ))}
              </div>
            )}
            {!placeResults.length && !searchingPlaces && locationQuery.trim().length >= 2 && (
              <p className="mt-3 text-xs text-[var(--foreground)]/45">No places found. Try a different name or spelling.</p>
            )}
          </div>

          <div className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Crosshair className="h-4 w-4 text-[var(--map-accent)]" />
              Or tap the map to drop the memory exactly where it happened
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-full bg-[var(--surface-strong)] text-xs font-medium hover:bg-[var(--card-strong)]"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <LoaderCircle className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 mr-2" />
                )}
                {gettingLocation ? "Locating..." : "Use my current location"}
              </Button>
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
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/65">Date visited</label>
              <Input value={visitedAt} onChange={(event) => setVisitedAt(event.target.value)} type="date" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" required />
            <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" required />
          </div>

          <VisitedWithPicker selectedFriendIds={taggedUserIds} onChange={setTaggedUserIds} />

          <details className="rounded-3xl border bg-[var(--surface-soft)] p-4 text-sm text-[var(--foreground)]/65">
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

          <div className="rounded-3xl border bg-[var(--surface-soft)] p-4 text-sm text-[var(--foreground)]/65">
            <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
              <MapPin className="h-4 w-4 text-[var(--map-accent)]" />
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

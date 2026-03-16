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
import { CollectionPicker } from "@/components/collections/collection-picker";
import {
  buildLocationDisplayName,
  getGeolocationErrorMessage,
  getReverseLookupErrorMessage,
  hasFiniteCoordinates,
  parseCoordinateInput,
  serializeVisitedDateInput
} from "@/lib/create-post-location";
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
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<{
    tone: "pending" | "success" | "error";
    message: string;
  } | null>(null);
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reverseLookupAbortRef = useRef<AbortController | null>(null);
  const locationRequestIdRef = useRef(0);
  const ignoreNextSearchRef = useRef(false);
  const showFirstMemoryGuide =
    !uploadState &&
    !caption.trim() &&
    !placeName.trim() &&
    !visitedAt &&
    taggedUserIds.length === 0 &&
    collectionIds.length === 0;

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      abortRef.current?.abort();
      reverseLookupAbortRef.current?.abort();
    };
  }, []);

  function beginLocationRequest() {
    reverseLookupAbortRef.current?.abort();
    locationRequestIdRef.current += 1;
    return locationRequestIdRef.current;
  }

  function cancelActiveLocationRequest() {
    reverseLookupAbortRef.current?.abort();
    locationRequestIdRef.current += 1;
    setGettingLocation(false);
    setResolvingLocation(false);
  }

  function clearPlaceSearchState() {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    abortRef.current?.abort();
    setSearchingPlaces(false);
    setPlaceResults([]);
    setPlaceSearchError(null);
  }

  function applyResolvedLocation(place: PlaceSearchResult, feedbackMessage?: string) {
    setPlaceName(place.placeName);
    setCity(place.city);
    setCountry(place.country);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    ignoreNextSearchRef.current = true;
    setLocationQuery(place.displayName);
    clearPlaceSearchState();
    setResolvingLocation(false);
    setGettingLocation(false);
    setLocationFeedback(
      feedbackMessage
        ? {
            tone: "success",
            message: feedbackMessage
          }
        : null
    );
  }

  async function resolveSelectedCoordinates({
    latitude,
    longitude,
    source,
    requestId
  }: {
    latitude: number;
    longitude: number;
    source: "device" | "map" | "coordinates";
    requestId: number;
  }) {
    const controller = new AbortController();
    reverseLookupAbortRef.current = controller;
    clearPlaceSearchState();
    setLatitude(latitude);
    setLongitude(longitude);
    setPlaceName("");
    setCity("");
    setCountry("");
    ignoreNextSearchRef.current = true;
    setLocationQuery("");
    setResolvingLocation(true);
    setLocationFeedback({
      tone: "pending",
      message:
        source === "device"
          ? "Applying your current location and confirming the place..."
          : source === "coordinates"
            ? "Refreshing place details from these coordinates..."
            : "Updating the pin location and confirming the place..."
    });

    try {
      const response = await fetch(`/api/places/reverse?lat=${latitude}&lon=${longitude}`, {
        signal: controller.signal
      });

      if (controller.signal.aborted || requestId !== locationRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = getReverseLookupErrorMessage(data?.code);
        setLocationFeedback({ tone: "error", message });
        if (source === "device") {
          toast.error(message);
        }
        return;
      }

      const data = await response.json();
      if (controller.signal.aborted || requestId !== locationRequestIdRef.current) {
        return;
      }

      const resolvedPlace: PlaceSearchResult = {
        id: `resolved:${latitude},${longitude}`,
        placeName: data.place.placeName,
        city: data.place.city,
        country: data.place.country,
        latitude,
        longitude,
        displayName: buildLocationDisplayName({
          placeName: data.place.placeName,
          city: data.place.city,
          country: data.place.country
        })
      };

      applyResolvedLocation(
        resolvedPlace,
        source === "device"
          ? "Current location applied."
          : source === "coordinates"
            ? "Coordinates applied."
            : "Pin location updated."
      );

      if (source === "device") {
        toast.success("Current location applied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (requestId !== locationRequestIdRef.current) {
        return;
      }

      const message = getReverseLookupErrorMessage();
      setLocationFeedback({ tone: "error", message });
      if (source === "device") {
        toast.error(message);
      }
    } finally {
      if (requestId === locationRequestIdRef.current) {
        setResolvingLocation(false);
        if (source === "device") {
          setGettingLocation(false);
        }
      }
    }
  }

  // Debounced place search — 300ms delay, cancels in-flight requests
  const searchPlaces = useCallback(async (q: string, signal: AbortSignal) => {
    if (q.trim().length < 2) {
      setPlaceResults([]);
      setSearchingPlaces(false);
      setPlaceSearchError(null);
      return;
    }

    setSearchingPlaces(true);
    setPlaceSearchError(null);
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(q.trim())}`, { signal });
      if (signal.aborted) return;
      if (!response.ok) {
        setPlaceResults([]);
        setPlaceSearchError("Place search is temporarily unavailable. Try again or place the pin manually.");
        setSearchingPlaces(false);
        return;
      }
      const data = await response.json();
      if (!signal.aborted) {
        setPlaceResults(data.places ?? []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPlaceResults([]);
      setPlaceSearchError("Place search is temporarily unavailable. Try again or place the pin manually.");
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
      setPlaceSearchError(null);
      return;
    }

    if (ignoreNextSearchRef.current) {
      ignoreNextSearchRef.current = false;
      setPlaceResults([]);
      setSearchingPlaces(false);
      setPlaceSearchError(null);
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

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Upload failed.");
        return;
      }

      const data = await response.json();
      setUploadState(data);
      toast.success("Media uploaded.");
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function applyPlaceResult(place: PlaceSearchResult) {
    cancelActiveLocationRequest();
    applyResolvedLocation(place, "Place selected.");
  }

  function getCurrentLocation() {
    if (typeof window === "undefined") {
      return;
    }

    const secureContext = window.isSecureContext;
    if (!secureContext) {
      const message = getGeolocationErrorMessage({
        supported: !!navigator.geolocation,
        secureContext
      });
      setLocationFeedback({ tone: "error", message });
      toast.error(message);
      return;
    }

    if (!navigator.geolocation) {
      const message = getGeolocationErrorMessage({
        supported: false,
        secureContext
      });
      setLocationFeedback({ tone: "error", message });
      toast.error(message);
      return;
    }

    const requestId = beginLocationRequest();

    setGettingLocation(true);
    setLocationFeedback({
      tone: "pending",
      message: "Requesting your current location..."
    });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (requestId !== locationRequestIdRef.current) {
          return;
        }

        await resolveSelectedCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "device",
          requestId
        });
      },
      (error) => {
        if (requestId !== locationRequestIdRef.current) {
          return;
        }

        setGettingLocation(false);
        setResolvingLocation(false);
        const message = getGeolocationErrorMessage({
          supported: true,
          secureContext,
          code: error.code
        });
        setLocationFeedback({ tone: "error", message });
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function handleCoordinateSelection(
    coordinates: { latitude: number; longitude: number },
    source: "map" | "coordinates"
  ) {
    const requestId = beginLocationRequest();
    void resolveSelectedCoordinates({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source,
      requestId
    });
  }


  async function onSubmit() {
    if (!uploadState) {
      toast.error("Upload a photo or video first.");
      return;
    }

    if (gettingLocation || resolvingLocation) {
      toast.error("Wait for the selected location to finish updating before publishing.");
      return;
    }

    if (!caption.trim() || !placeName.trim() || !city.trim() || !country.trim() || !visitedAt) {
      toast.error("Fill in the memory details before publishing.");
      return;
    }

    if (!hasFiniteCoordinates(latitude, longitude)) {
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
      visitedAt: serializeVisitedDateInput(visitedAt),
      taggedUserIds,
      collectionIds
    };

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Could not create post.");
        return;
      }

      toast.success("Your memory is pinned.");
      router.replace("/map");
    } catch {
      toast.error("Could not create post. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {showFirstMemoryGuide ? (
        <section className="glass-panel rounded-[2rem] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">First memory</p>
          <h2 className="mt-2 font-[var(--font-serif)] text-3xl md:text-4xl">Start with one place you want to remember.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--foreground)]/66">
            You only need three things to make your first Pinly post feel right: a photo or video, the place, and a short memory caption.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]/45">1. Upload</p>
              <p className="mt-2 text-sm text-[var(--foreground)]/68">Choose one photo or short video from the moment.</p>
            </div>
            <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]/45">2. Place it</p>
              <p className="mt-2 text-sm text-[var(--foreground)]/68">Search for the place or tap the map exactly where it happened.</p>
            </div>
            <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]/45">3. Publish</p>
              <p className="mt-2 text-sm text-[var(--foreground)]/68">Add a caption and date, then pin it to your map.</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
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
              <p className="mt-2 max-w-xs text-sm text-[var(--foreground)]/55">
                Upload a photo or a short video for this memory moment.
              </p>
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
              {placeSearchError ? (
                <p className="mt-3 text-xs text-rose-600">{placeSearchError}</p>
              ) : null}
              {!placeSearchError && !placeResults.length && !searchingPlaces && locationQuery.trim().length >= 2 && (
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
                  disabled={gettingLocation || resolvingLocation}
                >
                  {gettingLocation ? (
                    <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-3.5 w-3.5" />
                  )}
                  {gettingLocation ? "Finding location..." : resolvingLocation ? "Updating place..." : "Use my current location"}
                </Button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.75rem]">
                <DynamicLocationPicker
                  position={latitude !== null && longitude !== null ? { latitude, longitude } : null}
                  onSelect={(coordinates) => handleCoordinateSelection(coordinates, "map")}
                />
              </div>

              {(locationFeedback || hasFiniteCoordinates(latitude, longitude)) && (
                <div
                  className={`mt-4 rounded-[1.5rem] border px-4 py-3 ${
                    locationFeedback?.tone === "error"
                      ? "border-rose-200 bg-rose-50/80"
                      : locationFeedback?.tone === "success"
                        ? "border-[rgba(56,182,201,0.22)] bg-[rgba(56,182,201,0.08)]"
                        : "border-[rgba(24,85,56,0.14)] bg-[var(--surface-strong)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--foreground)]/45">Selected location</p>
                      <p className="mt-1 truncate text-sm font-medium text-[var(--foreground)]">
                        {placeName.trim() || (hasFiniteCoordinates(latitude, longitude) ? "Pinned coordinates selected" : "No place selected yet")}
                      </p>
                      {city.trim() || country.trim() ? (
                        <p className="mt-1 text-xs text-[var(--foreground)]/60">
                          {[city.trim(), country.trim()].filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                      {locationFeedback ? (
                        <p className="mt-2 text-xs text-[var(--foreground)]/68">{locationFeedback.message}</p>
                      ) : null}
                    </div>
                    {hasFiniteCoordinates(latitude, longitude) ? (
                      <p className="shrink-0 font-mono text-[11px] text-[var(--foreground)]/52">
                        {latitude!.toFixed(4)}, {longitude!.toFixed(4)}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

          <Textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="What made this place feel special?"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              value={placeName}
              onChange={(event) => {
                setPlaceName(event.target.value);
                if (locationFeedback?.tone === "error") {
                  setLocationFeedback(null);
                }
              }}
              placeholder="Place name"
              required
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/65">Date visited</label>
              <Input value={visitedAt} onChange={(event) => setVisitedAt(event.target.value)} type="date" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                if (locationFeedback?.tone === "error") {
                  setLocationFeedback(null);
                }
              }}
              placeholder="City"
              required
            />
            <Input
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                if (locationFeedback?.tone === "error") {
                  setLocationFeedback(null);
                }
              }}
              placeholder="Country"
              required
            />
          </div>

          <VisitedWithPicker selectedFriendIds={taggedUserIds} onChange={setTaggedUserIds} />

          <CollectionPicker selectedCollectionIds={collectionIds} onChange={setCollectionIds} />

          <details className="rounded-3xl border bg-[var(--surface-soft)] p-4 text-sm text-[var(--foreground)]/65">
            <summary className="cursor-pointer font-medium text-[var(--foreground)]">Advanced coordinates</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                value={latitude ?? ""}
                onChange={(event) => setLatitude(parseCoordinateInput(event.target.value))}
                onBlur={() => {
                  if (hasFiniteCoordinates(latitude, longitude)) {
                    handleCoordinateSelection({ latitude: latitude!, longitude: longitude! }, "coordinates");
                  }
                }}
                type="number"
                step="0.000001"
                placeholder="Latitude"
              />
              <Input
                value={longitude ?? ""}
                onChange={(event) => setLongitude(parseCoordinateInput(event.target.value))}
                onBlur={() => {
                  if (hasFiniteCoordinates(latitude, longitude)) {
                    handleCoordinateSelection({ latitude: latitude!, longitude: longitude! }, "coordinates");
                  }
                }}
                type="number"
                step="0.000001"
                placeholder="Longitude"
              />
            </div>
            <p className="mt-3 text-xs text-[var(--foreground)]/55">
              Leaving either coordinate field refreshes the selected place details from the newest pin.
            </p>
          </details>

          <div className="rounded-3xl border bg-[var(--surface-soft)] p-4 text-sm text-[var(--foreground)]/65">
            <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
              <MapPin className="h-4 w-4 text-[var(--map-accent)]" />
              Intentional place-based posting only
            </div>
            <p className="mt-2">Search for a place, tap the map, or fine-tune with advanced coordinates. No live location is used.</p>
          </div>
          <Button
            type="button"
            onClick={onSubmit}
            className="w-full"
            disabled={submitting || uploading || gettingLocation || resolvingLocation}
          >
            {submitting ? "Saving pin..." : "Publish memory"}
          </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

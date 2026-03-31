"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Crosshair, LoaderCircle, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { VisitedWithPicker } from "@/components/create/visited-with-picker";
import { MediaView } from "@/components/post/media-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildLocationDisplayName,
  getGeolocationErrorMessage,
  getReverseLookupErrorMessage,
  hasFiniteCoordinates,
  parseCoordinateInput,
  serializeVisitedDateInput
} from "@/lib/create-post-location";
import { formatVisitDate } from "@/lib/utils";
import type { PlaceSearchResult, PostSummary } from "@/types/app";

const DynamicLocationPicker = dynamic(
  () => import("@/components/create/location-picker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-[320px] rounded-[1.75rem] border bg-[var(--surface-soft)]" />
  }
);

function toDateInputValue(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EditPostForm({ post }: { post: PostSummary }) {
  const router = useRouter();
  const [caption, setCaption] = useState(post.caption);
  const [placeName, setPlaceName] = useState(post.placeName);
  const [city, setCity] = useState(post.city);
  const [country, setCountry] = useState(post.country);
  const [visitedAt, setVisitedAt] = useState(() => toDateInputValue(post.visitedAt));
  const [latitude, setLatitude] = useState<number | null>(post.latitude);
  const [longitude, setLongitude] = useState<number | null>(post.longitude);
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
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>(
    () => post.visitedWith?.map((friend) => friend.id) ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reverseLookupAbortRef = useRef<AbortController | null>(null);
  const locationRequestIdRef = useRef(0);
  const ignoreNextSearchRef = useRef(false);

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

  const searchPlaces = useCallback(async (query: string, signal: AbortSignal) => {
    if (query.trim().length < 2) {
      setPlaceResults([]);
      setSearchingPlaces(false);
      setPlaceSearchError(null);
      return;
    }

    setSearchingPlaces(true);
    setPlaceSearchError(null);
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(query.trim())}`, { signal });
      if (signal.aborted) {
        return;
      }
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
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setPlaceResults([]);
      setPlaceSearchError("Place search is temporarily unavailable. Try again or place the pin manually.");
    } finally {
      if (!signal.aborted) {
        setSearchingPlaces(false);
      }
    }
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
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

    setSearchingPlaces(true);

    const controller = new AbortController();
    abortRef.current = controller;

    searchTimerRef.current = setTimeout(() => {
      void searchPlaces(locationQuery, controller.signal);
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      controller.abort();
    };
  }, [locationQuery, searchPlaces]);

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
    if (gettingLocation || resolvingLocation) {
      toast.error("Wait for the selected location to finish updating before saving.");
      return;
    }

    if (!caption.trim() || !placeName.trim() || !city.trim() || !country.trim() || !visitedAt) {
      toast.error("Fill in the memory details before saving.");
      return;
    }

    if (!hasFiniteCoordinates(latitude, longitude)) {
      toast.error("Choose a place by tapping the map or searching for one.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          placeName: placeName.trim(),
          city: city.trim(),
          country: country.trim(),
          latitude,
          longitude,
          visitedAt: serializeVisitedDateInput(visitedAt),
          taggedUserIds
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Could not update this memory.");
        return;
      }

      toast.success("Memory updated.");
      router.replace(`/posts/${post.id}`);
    } catch {
      toast.error("Could not update this memory. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="overflow-hidden rounded-[1.75rem] border bg-[var(--surface-strong)] shadow-sm">
        <div className="aspect-[4/3]">
          <MediaView
            mediaType={post.mediaType}
            mediaUrl={post.mediaUrl}
            thumbnailUrl={post.thumbnailUrl}
            className="rounded-none"
          />
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Edit memory</p>
          <h1 className="font-[var(--font-serif)] text-[2rem] leading-[1.08] text-[var(--foreground)]">
            Update the details, keep the moment.
          </h1>
          <p className="text-sm leading-6 text-[var(--foreground)]/66">
            Change the caption, visit date, place, or who was with you without replacing the original photo or video.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--foreground)]/55">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-[var(--accent)]" />
              Posted {formatVisitDate(post.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--map-accent)]" />
              {buildLocationDisplayName(post)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Details</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/65">Caption</label>
            <Textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="What made this place feel special?"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/65">Place label</label>
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
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/65">Date visited</label>
              <Input value={visitedAt} onChange={(event) => setVisitedAt(event.target.value)} type="date" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/65">City</label>
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
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/65">Country</label>
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
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Location</p>
        <div className="mt-4 space-y-4">
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
              {searchingPlaces ? (
                <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--map-accent)]" />
              ) : null}
            </div>
            {!!placeResults.length ? (
              <div className="mt-3 space-y-2">
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
            ) : null}
            {placeSearchError ? (
              <p className="mt-3 text-xs text-rose-600">{placeSearchError}</p>
            ) : null}
            {!placeSearchError && !placeResults.length && !searchingPlaces && locationQuery.trim().length >= 2 ? (
              <p className="mt-3 text-xs text-[var(--foreground)]/45">No places found. Try a different name or spelling.</p>
            ) : null}
          </div>

          <div className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Crosshair className="h-4 w-4 text-[var(--map-accent)]" />
              Or tap the map to move the pin
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

            {(locationFeedback || hasFiniteCoordinates(latitude, longitude)) ? (
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
            ) : null}
          </div>

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
        </div>
      </section>

      <VisitedWithPicker
        selectedFriendIds={taggedUserIds}
        onChange={setTaggedUserIds}
        initialSelectedFriends={post.visitedWith ?? []}
      />

      <section className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="h-12 rounded-2xl"
            onClick={() => router.push(`/posts/${post.id}`)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-12 rounded-2xl px-5"
            onClick={onSubmit}
            disabled={submitting || gettingLocation || resolvingLocation}
          >
            {submitting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Saving changes...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}

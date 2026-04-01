"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Filter, LoaderCircle, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { NoConnectionCard } from "@/components/network/no-connection-card";
import { useNetworkStatus } from "@/components/network/network-status-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/map/bottom-sheet";
import { MapErrorBoundary } from "@/components/map/map-error-boundary";
import { CityContextPanel } from "@/components/map/city-context-panel";
import { FilterSidebar } from "@/components/map/filter-sidebar";
import { FriendActivityPanel } from "@/components/map/friend-activity-panel";
import { LayerToggle } from "@/components/map/layer-toggle";
import { MapModeToggle } from "@/components/map/map-mode-toggle";
import { SameLocationSheet } from "@/components/map/same-location-sheet";
import { WelcomeCard } from "@/components/map/welcome-card";
import { buildCollectionOverlayFitBoundsTarget, buildResolvedMapCollectionOverlays } from "@/lib/map-collection-overlays";
import { buildLightweightMapGroups } from "@/lib/map-groups";
import { cn } from "@/lib/utils";
import {
  backFromPostPreview,
  canReturnToLocationPreview,
  closeMapPreview,
  findPlaceClusterMarker,
  getExpandedPreviewPost,
  getSelectedLocationPreviewMarkerId,
  hasOpenMapPreview,
  IDLE_MAP_PREVIEW_STATE,
  openFocusedPostPreview,
  openLocationPreview,
  openPostPreview,
  syncPreviewStateWithMarkers,
  type MapPreviewState
} from "@/lib/map-preview-state";
import {
  buildMapPathWithoutFocusedPost,
  clearConsumedMapFocusTarget,
  createFocusedPostViewport,
  parseMapFocusedPostTarget,
  resolveMapFocusTarget
} from "@/lib/map-post-navigation";
import { MAP_MODE_STORAGE_KEY, getMapStyle, isSatelliteModeAvailable, parseStoredMapMode } from "@/lib/map-style";
import { canonicalizeViewportForDataQuery, createViewportFingerprint, FULL_WORLD_BOUNDS, type MapViewport } from "@/lib/map-viewport";
import type { LayerMode, MapCategory, MapCollectionOverlay, MapGroupOption, MapResponse, MapVisualMode, PlaceClusterMarker, PostSummary, TimeFilter } from "@/types/app";

const DynamicMapCanvas = dynamic(() => import("@/components/map/map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="pinly-map-fallback-stage flex items-center justify-center rounded-[2rem] border bg-[var(--surface-soft)]">
      <LoaderCircle className="h-6 w-6 animate-spin text-[var(--map-accent)]" />
    </div>
  )
});

const emptyMap: MapResponse = {
  stage: "world",
  markers: [],
  cityContext: null,
  friendActivity: []
};
const satelliteApiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";

function hasRenderableMapData(mapData: MapResponse) {
  return mapData.markers.length > 0 || mapData.cityContext !== null || mapData.friendActivity.length > 0;
}

function buildCurrentLocationViewport(latitude: number, longitude: number): MapViewport {
  return canonicalizeViewportForDataQuery({
    zoom: 12.75,
    bounds: {
      north: latitude + 0.18,
      south: latitude - 0.18,
      east: longitude + 0.18,
      west: longitude - 0.18
    }
  });
}

function getMapLoadErrorMessage(isOnline: boolean) {
  return isOnline
    ? "Pinly could not refresh the map right now. Retry to keep exploring."
    : "You're offline. Reconnect to load the map and friend activity.";
}

export function MapPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isOnline } = useNetworkStatus();
  const focusedPostFromQuery = useMemo(() => parseMapFocusedPostTarget(searchParams), [searchParams]);
  const didToastSatelliteFallbackRef = useRef(false);
  const lastAppliedFocusedPostKeyRef = useRef<string | null>(null);
  const latestMapDataRef = useRef<MapResponse>(emptyMap);
  const mapRequestIdRef = useRef(0);
  const [mapData, setMapData] = useState<MapResponse>(emptyMap);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [mapRetryNonce, setMapRetryNonce] = useState(0);
  const [groupOptions, setGroupOptions] = useState<MapGroupOption[]>([]);
  const [collectionsOverlayMode, setCollectionsOverlayMode] = useState<LayerMode | null>(null);
  const [collectionsOverlayLoading, setCollectionsOverlayLoading] = useState(false);
  const [collectionOverlays, setCollectionOverlays] = useState<ReturnType<typeof buildResolvedMapCollectionOverlays>>([]);
  const [collectionOverlayFitBoundsTarget, setCollectionOverlayFitBoundsTarget] = useState<{
    key: string;
    points: Array<{ latitude: number; longitude: number }>;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<LayerMode>("both");
  const [mapMode, setMapMode] = useState<MapVisualMode>("default");
  const [mapModeHydrated, setMapModeHydrated] = useState(false);
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const [time, setTime] = useState<TimeFilter>("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<MapCategory[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [previewState, setPreviewState] = useState<MapPreviewState>(IDLE_MAP_PREVIEW_STATE);
  const [pendingFocusedPost, setPendingFocusedPost] = useState(focusedPostFromQuery);
  const [pendingMapFocusTarget, setPendingMapFocusTarget] = useState(focusedPostFromQuery);
  const [manualFocusCoordinates, setManualFocusCoordinates] = useState<{
    latitude: number;
    longitude: number;
    key: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [deviceLocationMessage, setDeviceLocationMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState<MapViewport>(() =>
    focusedPostFromQuery
      ? createFocusedPostViewport(focusedPostFromQuery)
      : canonicalizeViewportForDataQuery({
          zoom: 2,
          bounds: FULL_WORLD_BOUNDS
        })
  );
  const deferredQuery = useDeferredValue(query);
  const satelliteModeAvailable = isSatelliteModeAvailable(satelliteApiKey);
  const satelliteToggleVisible = true;
  const satelliteAvailability = satelliteFailed ? "failed" : "available";
  const activeMapMode = satelliteModeAvailable && !satelliteFailed ? mapMode : "default";
  const collectionsOverlayEnabled = collectionsOverlayMode !== null;
  const effectiveLayer = collectionsOverlayMode ?? layer;
  const expandedPost = getExpandedPreviewPost(previewState);
  const selectedLocationMarkerId = getSelectedLocationPreviewMarkerId(previewState);
  const mapFocusTarget = resolveMapFocusTarget({
    pendingTarget: pendingMapFocusTarget,
    queryTarget: focusedPostFromQuery
  });
  const selectedLocationCluster = useMemo(
    () => (previewState.kind === "location" ? findPlaceClusterMarker(mapData.markers, previewState.markerId) : null),
    [mapData.markers, previewState]
  );
  const previewSurfaceOpen = hasOpenMapPreview(previewState);
  const canReturnToAllMemories = canReturnToLocationPreview(previewState);
  const mapStyle = useMemo(
    () =>
      getMapStyle({
        mode: activeMapMode,
        satelliteApiKey
      }),
    [activeMapMode]
  );
  const mapInitialViewState = useMemo(
    () =>
      mapFocusTarget
        ? {
            longitude: mapFocusTarget.longitude,
            latitude: mapFocusTarget.latitude,
            zoom: 13,
            pitch: 45,
            bearing: 0
          }
        : undefined,
    [mapFocusTarget]
  );
  const mapFocusedCoordinates = useMemo(
    () =>
      manualFocusCoordinates
        ? manualFocusCoordinates
        : mapFocusTarget
          ? {
              latitude: mapFocusTarget.latitude,
              longitude: mapFocusTarget.longitude,
              key: mapFocusTarget.key
            }
          : null,
    [manualFocusCoordinates, mapFocusTarget]
  );

  useEffect(() => {
    latestMapDataRef.current = mapData;
  }, [mapData]);

  useEffect(() => {
    if (!focusedPostFromQuery) {
      lastAppliedFocusedPostKeyRef.current = null;
      setPendingFocusedPost(null);
      return;
    }

    if (lastAppliedFocusedPostKeyRef.current === focusedPostFromQuery.key) {
      return;
    }

    lastAppliedFocusedPostKeyRef.current = focusedPostFromQuery.key;
    setLoadingMap(true);
    setFilterOpen(false);
    setPreviewState(closeMapPreview());
    setPendingFocusedPost(focusedPostFromQuery);
    setPendingMapFocusTarget(focusedPostFromQuery);
    setViewport(createFocusedPostViewport(focusedPostFromQuery));
  }, [focusedPostFromQuery]);

  useEffect(() => {
    try {
      const storedMapMode = parseStoredMapMode(window.localStorage.getItem(MAP_MODE_STORAGE_KEY));

      if (storedMapMode) {
        setMapMode(storedMapMode);
      }
    } catch {
      // Ignore storage access issues in private browsing or restrictive environments.
    } finally {
      setMapModeHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!mapModeHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(MAP_MODE_STORAGE_KEY, mapMode);
    } catch {
      // Ignore storage access issues in private browsing or restrictive environments.
    }
  }, [mapModeHydrated, mapMode]);

  // Load friend groups
  useEffect(() => {
    let ignore = false;

    async function loadGroups() {
      try {
        const response = await fetch("/api/friends/list");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!ignore) {
          setGroupOptions(buildLightweightMapGroups(data.friends ?? []));
        }
      } catch {
        // Keep the current UI responsive when the network is unavailable.
      }
    }

    void loadGroups();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!collectionsOverlayMode) {
      setCollectionsOverlayLoading(false);
      setCollectionOverlays([]);
      setCollectionOverlayFitBoundsTarget(null);
      return;
    }

    const overlayLayer = collectionsOverlayMode;
    const abortController = new AbortController();
    let ignore = false;

    async function loadCollectionOverlay() {
      setCollectionsOverlayLoading(true);

      const params = new URLSearchParams({
        layer: overlayLayer,
        time
      });

      if (selectedGroupIds.length) {
        params.set("groups", selectedGroupIds.join(","));
      }

      let response: Response;

      try {
        response = await fetch(`/api/map/collections?${params.toString()}`, {
          signal: abortController.signal
        });
      } catch (error) {
        if (ignore || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        setCollectionOverlays([]);
        setCollectionOverlayFitBoundsTarget(null);
        setCollectionsOverlayLoading(false);
        return;
      }

      if (!response.ok || ignore) {
        if (!ignore) {
          setCollectionOverlays([]);
          setCollectionOverlayFitBoundsTarget(null);
          setCollectionsOverlayLoading(false);
        }
        return;
      }

      const data = (await response.json().catch(() => null)) as { collections?: MapCollectionOverlay[] } | null;

      if (!data || ignore) {
        if (!ignore) {
          setCollectionOverlays([]);
          setCollectionOverlayFitBoundsTarget(null);
          setCollectionsOverlayLoading(false);
        }
        return;
      }

      const nextCollectionOverlays = buildResolvedMapCollectionOverlays(data.collections ?? []);

      setCollectionOverlays(nextCollectionOverlays);
      setCollectionOverlayFitBoundsTarget(
        buildCollectionOverlayFitBoundsTarget(
          `collections-overlay:${collectionsOverlayMode}:${time}:${selectedGroupIds.join(",")}:${nextCollectionOverlays
            .map((collectionOverlay) => `${collectionOverlay.id}:${collectionOverlay.postIds.join(",")}`)
            .join("|")}`,
          nextCollectionOverlays
        )
      );
      setCollectionsOverlayLoading(false);
    }

    void loadCollectionOverlay();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [collectionsOverlayMode, selectedGroupIds, time]);

  useEffect(() => {
    const abortController = new AbortController();
    let ignore = false;
    const requestId = mapRequestIdRef.current + 1;
    mapRequestIdRef.current = requestId;

    async function loadMap() {
      setLoadingMap(true);
      setMapLoadError(null);
      const params = new URLSearchParams({
        north: String(viewport.bounds.north),
        south: String(viewport.bounds.south),
        east: String(viewport.bounds.east),
        west: String(viewport.bounds.west),
        zoom: String(viewport.zoom),
        layer: effectiveLayer,
        time
      });

      if (collectionsOverlayEnabled) {
        params.set("collectionsOverlay", "1");
      }

      if (selectedGroupIds.length) {
        params.set("groups", selectedGroupIds.join(","));
      }

      if (selectedCategories.length) {
        params.set("categories", selectedCategories.join(","));
      }

      if (deferredQuery.trim()) {
        params.set("q", deferredQuery.trim());
      }

      let response: Response;

      try {
        response = await fetch(`/api/posts?${params.toString()}`, {
          signal: abortController.signal
        });
      } catch (error) {
        if (ignore || requestId !== mapRequestIdRef.current || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        if (!hasRenderableMapData(latestMapDataRef.current)) {
          setMapData(emptyMap);
        }
        setMapLoadError(getMapLoadErrorMessage(isOnline));
        setLoadingMap(false);
        return;
      }

      const data = (await response.json().catch(() => null)) as Partial<MapResponse> | null;

      if (!response.ok || !data) {
        if (!ignore && requestId === mapRequestIdRef.current) {
          if (!hasRenderableMapData(latestMapDataRef.current)) {
            setMapData(emptyMap);
          }
          setMapLoadError(getMapLoadErrorMessage(isOnline));
          setLoadingMap(false);
        }
        return;
      }

      if (ignore || requestId !== mapRequestIdRef.current) {
        return;
      }

      setMapData({
        stage: data.stage ?? "world",
        markers: data.markers ?? [],
        cityContext: data.cityContext ?? null,
        friendActivity: data.friendActivity ?? []
      });
      setMapLoadError(null);
      setLoadingMap(false);
    }

    void loadMap();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [viewport, deferredQuery, effectiveLayer, time, selectedGroupIds, selectedCategories, collectionsOverlayEnabled, isOnline, mapRetryNonce]);

  useEffect(() => {
    setPreviewState((currentState) => syncPreviewStateWithMarkers(currentState, mapData.markers));
  }, [mapData.markers]);

  useEffect(() => {
    setPreviewState(closeMapPreview());
  }, [collectionsOverlayMode]);

  useEffect(() => {
    if (!pendingFocusedPost) {
      return;
    }

    const nextPreviewState = openFocusedPostPreview(mapData.markers, pendingFocusedPost.postId);

    if (nextPreviewState) {
      setFilterOpen(false);
      setPreviewState(nextPreviewState);
      setPendingFocusedPost(null);

      if (focusedPostFromQuery?.key === pendingFocusedPost.key) {
        router.replace(buildMapPathWithoutFocusedPost(pathname, searchParams), { scroll: false });
      }

      return;
    }

    if (!loadingMap) {
      setPendingFocusedPost(null);
      setPendingMapFocusTarget((currentTarget) => clearConsumedMapFocusTarget(currentTarget, pendingFocusedPost.key));

      if (focusedPostFromQuery?.key === pendingFocusedPost.key) {
        router.replace(buildMapPathWithoutFocusedPost(pathname, searchParams), { scroll: false });
      }
    }
  }, [focusedPostFromQuery, loadingMap, mapData.markers, pathname, pendingFocusedPost, router, searchParams]);

  useEffect(() => {
    if (previewSurfaceOpen && filterOpen) {
      setFilterOpen(false);
    }
  }, [filterOpen, previewSurfaceOpen]);

  const showControls = mapData.stage !== "world";
  const showWelcomeCard = mapData.stage === "world" || !mapData.cityContext;
  const forceWelcomeOpen = searchParams.get("welcome") === "1";
  const activeFilterCount = (time !== "all" ? 1 : 0) + selectedGroupIds.length + selectedCategories.length + (collectionsOverlayEnabled ? 1 : 0);
  const collectionsOverlayCount = collectionOverlays.length;
  const activeSearchQuery = deferredQuery.trim();
  const showEmptySearchState = activeSearchQuery.length > 0 && !loadingMap && mapData.markers.length === 0;
  const showMapErrorState = Boolean(mapLoadError) && !hasRenderableMapData(mapData);
  const showMapErrorBanner = Boolean(mapLoadError) && hasRenderableMapData(mapData);
  const minimalCopy = useMemo(
    () =>
      mapData.stage === "world"
        ? "Start from the world. City clusters reveal travel memories as you zoom."
        : "Search, filter, and switch layers while exploring your friends' memory map.",
    [mapData.stage]
  );

  function renderFilterControl(panelClassName?: string) {
    return (
      <div className={cn("glass-panel flex w-fit items-center rounded-full p-1 shadow-sm", panelClassName)}>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label="Open filters"
          aria-controls="pinly-map-filters"
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--foreground)]/5 md:gap-2 md:px-4 md:text-sm"
        >
          <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && <span>({activeFilterCount})</span>}
        </button>
      </div>
    );
  }

  function renderLocationControl(panelClassName?: string) {
    return (
      <div className={cn("glass-panel flex w-fit items-center rounded-full p-1 shadow-sm", panelClassName)}>
        <button
          type="button"
          onClick={handleLocateUser}
          aria-label="Use my current location"
          disabled={locatingUser}
          className="flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-[var(--foreground)]/74 transition hover:bg-[var(--foreground)]/5 disabled:cursor-not-allowed disabled:opacity-60 md:px-4 md:text-sm"
        >
          {locatingUser ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          <span className="hidden sm:inline">{locatingUser ? "Locating..." : "Use my location"}</span>
        </button>
      </div>
    );
  }

  function onViewportChange(nextViewport: MapViewport) {
    const nextQueryViewport = canonicalizeViewportForDataQuery(nextViewport);
    const nextFingerprint = createViewportFingerprint(nextQueryViewport);

    startTransition(() => {
      setViewport((currentViewport) =>
        createViewportFingerprint(currentViewport) === nextFingerprint ? currentViewport : nextQueryViewport
      );
    });
  }

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  }

  function toggleCategory(category: MapCategory) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((value) => value !== category) : [...current, category]
    );
  }

  function clearFilters() {
    setTime("all");
    setSelectedGroupIds([]);
    setSelectedCategories([]);
    setCollectionsOverlayMode(null);
    setCollectionOverlays([]);
    setCollectionOverlayFitBoundsTarget(null);
    setCollectionsOverlayLoading(false);
  }

  const handleRetryMap = useCallback(() => {
    setMapRetryNonce((current) => current + 1);
  }, []);

  const handleToggleCollectionsOverlay = useCallback(() => {
    setCollectionsOverlayMode((currentMode) => (currentMode ? null : "both"));
  }, []);

  const handleChangeCollectionsOverlayMode = useCallback((nextMode: LayerMode) => {
    setCollectionsOverlayMode(nextMode);
  }, []);

  const handleMapModeChange = useCallback(
    (nextMode: MapVisualMode) => {
      if (nextMode === "default") {
        setMapMode("default");
        return;
      }

      if (satelliteFailed) {
        toast.error("Satellite view is unavailable right now.");
        return;
      }

      setMapMode(nextMode);
    },
    [satelliteFailed]
  );

  const handleMapError = useCallback(
    (error: Error) => {
      if (activeMapMode !== "satellite" || didToastSatelliteFallbackRef.current) {
        return;
      }

      didToastSatelliteFallbackRef.current = true;
      setSatelliteFailed(true);
      setMapMode("default");
      toast.error("Satellite view is unavailable right now. Switched back to Map.");

      if (process.env.NODE_ENV !== "production") {
        console.error("Satellite map failed to load.", error);
      }
    },
    [activeMapMode]
  );

  const handleOpenLocationCluster = useCallback((marker: PlaceClusterMarker) => {
    setFilterOpen(false);
    setPreviewState(openLocationPreview(marker.id));
  }, []);

  const handleExpandPost = useCallback((post: PostSummary) => {
    setFilterOpen(false);
    setPreviewState(openPostPreview(post));
  }, []);

  const handleSelectLocationPost = useCallback((post: PostSummary) => {
    setFilterOpen(false);
    setPreviewState(openPostPreview(post, selectedLocationMarkerId));
  }, [selectedLocationMarkerId]);

  const handleFocusedCoordinatesApplied = useCallback((focusKey: string) => {
    setManualFocusCoordinates((currentCoordinates) =>
      currentCoordinates?.key === focusKey ? null : currentCoordinates
    );
    setPendingMapFocusTarget((currentTarget) => clearConsumedMapFocusTarget(currentTarget, focusKey));
  }, []);

  const handleLocateUser = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      const message = "Current location is not available on this device.";
      setDeviceLocationMessage(message);
      toast.error(message);
      return;
    }

    setLocatingUser(true);
    setDeviceLocationMessage("Finding your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        const focusKey = `device-location:${nextLocation.latitude.toFixed(5)}:${nextLocation.longitude.toFixed(5)}:${Date.now()}`;

        setLocatingUser(false);
        setUserLocation(nextLocation);
        setManualFocusCoordinates({ ...nextLocation, key: focusKey });
        setViewport(buildCurrentLocationViewport(nextLocation.latitude, nextLocation.longitude));
        setFilterOpen(false);
        setDeviceLocationMessage("Centered on your current location.");
        toast.success("Centered on your current location.");
      },
      (error) => {
        setLocatingUser(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission is turned off. Enable it to center the map on you."
            : "Pinly could not determine your current location.";
        setDeviceLocationMessage(message);
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    );
  }, []);

  const handleCloseLocationCluster = useCallback(() => {
    setPreviewState(closeMapPreview());
  }, []);

  const handleBackToLocationCluster = useCallback(() => {
    setPreviewState((currentState) => (currentState.kind === "post" ? backFromPostPreview(currentState) : currentState));
  }, []);

  const handleCloseExpandedPost = useCallback(() => {
    setPreviewState(closeMapPreview());
  }, []);

  return (
    <section
      className={cn(
        "pinly-map-stage relative isolate flex h-full min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border bg-[var(--surface-soft)] shadow-2xl shadow-black/5",
        filterOpen && "pinly-map-stage--filters-open"
      )}
      data-pinly-sidebar-open={filterOpen ? "true" : undefined}
    >
      <MapErrorBoundary>
        <DynamicMapCanvas
          markers={mapData.markers}
          mapMode={activeMapMode}
          mapStyle={mapStyle}
          expandedPostId={expandedPost?.id ?? null}
          selectedLocationMarkerId={selectedLocationMarkerId}
          userLocation={userLocation}
          collectionOverlays={collectionOverlays}
          collectionOverlayFitBoundsTarget={collectionOverlayFitBoundsTarget}
          initialViewState={mapInitialViewState}
          focusedCoordinates={mapFocusedCoordinates}
          onExpandPost={handleExpandPost}
          onFocusedCoordinatesApplied={handleFocusedCoordinatesApplied}
          onOpenLocationCluster={handleOpenLocationCluster}
          onMapError={handleMapError}
          onViewportChange={onViewportChange}
        />
      </MapErrorBoundary>

      <div className="pointer-events-none absolute inset-0 z-[700]">
        {!filterOpen && showMapErrorState ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="pointer-events-auto w-full max-w-sm">
              <NoConnectionCard
                title={isOnline ? "Map unavailable" : "No connection"}
                message={mapLoadError ?? "The map is temporarily unavailable."}
                retryLabel="Retry map"
                onRetry={handleRetryMap}
              />
            </div>
          </div>
        ) : null}

        {!previewSurfaceOpen && !filterOpen && (
          <div className="pointer-events-auto absolute left-3 top-3 z-10 hidden md:block md:left-5 md:top-5">
            {renderFilterControl()}
          </div>
        )}

        {!previewSurfaceOpen && !filterOpen && (
          <div className="pointer-events-auto absolute right-3 top-3 z-10 hidden md:block md:right-5 md:top-5">
            {renderLocationControl()}
          </div>
        )}

        {!previewSurfaceOpen && !filterOpen ? (
          <>
            <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between p-3 md:p-5">
              <div className="space-y-4">
                <div className="pointer-events-auto hidden max-w-xl items-center gap-4 rounded-full border bg-[var(--surface-strong)] px-4 py-3 shadow-sm md:inline-flex">
                  <Brand compact />
                  <p className="text-sm text-[var(--foreground)]/62">{minimalCopy}</p>
                </div>

                <div className="pointer-events-auto flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                  <div className="flex w-full max-w-xl flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative w-full sm:min-w-[280px] sm:max-w-xl">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
                        <Input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search places, cities, countries, people, captions"
                          className="bg-[var(--surface-strong)] pl-11 pr-11 shadow-sm"
                        />
                        {activeSearchQuery ? (
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--foreground)]/40">
                            {loadingMap ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {showControls && !collectionsOverlayEnabled ? (
                          <div className="glass-panel flex w-fit items-center rounded-full p-1 shadow-sm">
                            <LayerToggle value={layer} onChange={setLayer} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 md:hidden">
                      {renderFilterControl()}
                      {renderLocationControl()}
                    </div>
                  </div>
                  {showControls ? (
                    <Link href="/create" className="pointer-events-auto self-start">
                      <Button className="h-11 gap-2">
                        <Plus className="h-4 w-4" />
                        Add memory
                      </Button>
                    </Link>
                  ) : null}
                </div>
                {showEmptySearchState ? (
                  <div className="pointer-events-auto inline-flex max-w-lg items-center gap-2 rounded-2xl border bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)]/68 shadow-sm">
                    <Search className="h-4 w-4 text-[var(--map-accent)]" />
                    <span>No places, people, countries, or captions matched that search.</span>
                  </div>
                ) : null}
                {deviceLocationMessage ? (
                  <div className="pointer-events-auto inline-flex max-w-lg items-center gap-2 rounded-2xl border bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)]/68 shadow-sm">
                    {locatingUser ? <LoaderCircle className="h-4 w-4 animate-spin text-[var(--map-accent)]" /> : <Crosshair className="h-4 w-4 text-[var(--map-accent)]" />}
                    <span>{deviceLocationMessage}</span>
                  </div>
                ) : null}
                {showMapErrorBanner ? (
                  <div className="pointer-events-auto flex max-w-lg flex-wrap items-center gap-3 rounded-2xl border bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)]/68 shadow-sm">
                    <span className="min-w-0 flex-1">{mapLoadError}</span>
                    <Button variant="secondary" className="h-11 px-4" onClick={handleRetryMap}>
                      Retry
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {(showControls || showWelcomeCard || satelliteToggleVisible) && (
              <div className="pointer-events-none absolute inset-x-3 bottom-[calc(5.25rem+var(--keyboard-safe-area-bottom))] grid gap-3 md:bottom-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end xl:px-1 animate-in fade-in duration-500 ease-out">
                <div className="pointer-events-none flex flex-col-reverse gap-3 xl:flex-row xl:items-end xl:justify-between xl:gap-4">
                  {satelliteToggleVisible ? (
                    <div className="pointer-events-auto self-start xl:self-end">
                      <MapModeToggle
                        value={activeMapMode}
                        onChange={handleMapModeChange}
                        satelliteAvailability={satelliteAvailability}
                      />
                    </div>
                  ) : null}
                  <div className="pointer-events-auto max-w-md">
                    {mapData.cityContext ? (
                      <CityContextPanel cityContext={mapData.cityContext} />
                    ) : (
                      <WelcomeCard forceOpen={forceWelcomeOpen} />
                    )}
                  </div>
                </div>
                {showControls ? (
                  <div className="pointer-events-auto justify-self-end">
                    <FriendActivityPanel items={mapData.friendActivity} layer={effectiveLayer} />
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}

        <FilterSidebar
          open={filterOpen}
          time={time}
          selectedGroupIds={selectedGroupIds}
          selectedCategories={selectedCategories}
          groupOptions={groupOptions}
          collectionsOverlayMode={collectionsOverlayMode}
          collectionsOverlayCount={collectionsOverlayCount}
          collectionsOverlayLoading={collectionsOverlayLoading}
          onTimeChange={setTime}
          onToggleGroup={toggleGroup}
          onToggleCategory={toggleCategory}
          onToggleCollectionsOverlay={handleToggleCollectionsOverlay}
          onChangeCollectionsOverlayMode={handleChangeCollectionsOverlayMode}
          onClear={clearFilters}
          onClose={() => setFilterOpen(false)}
        />
      </div>

      <SameLocationSheet
        marker={selectedLocationCluster}
        onClose={handleCloseLocationCluster}
        onSelectPost={handleSelectLocationPost}
      />
      <BottomSheet
        post={expandedPost}
        onBack={canReturnToAllMemories ? handleBackToLocationCluster : undefined}
        backLabel="All memories"
        onClose={handleCloseExpandedPost}
      />
    </section>
  );
}

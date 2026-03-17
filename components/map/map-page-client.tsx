"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Filter, LoaderCircle, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/map/bottom-sheet";
import { CityContextPanel } from "@/components/map/city-context-panel";
import { FilterSidebar } from "@/components/map/filter-sidebar";
import { FriendActivityPanel } from "@/components/map/friend-activity-panel";
import { LayerToggle } from "@/components/map/layer-toggle";
import { MapModeToggle } from "@/components/map/map-mode-toggle";
import { SameLocationSheet } from "@/components/map/same-location-sheet";
import { WelcomeCard } from "@/components/map/welcome-card";
import { buildLightweightMapGroups } from "@/lib/map-groups";
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
import type { CollectionSummary, LayerMode, MapCategory, MapCollectionFilter, MapGroupOption, MapResponse, MapVisualMode, PlaceClusterMarker, PostSummary, TimeFilter } from "@/types/app";

const DynamicMapCanvas = dynamic(() => import("@/components/map/map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-[2rem] border bg-[var(--surface-soft)]">
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

export function MapPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusedPostFromQuery = useMemo(() => parseMapFocusedPostTarget(searchParams), [searchParams]);
  const didToastSatelliteFallbackRef = useRef(false);
  const lastAppliedFocusedPostKeyRef = useRef<string | null>(null);
  const latestMapDataRef = useRef<MapResponse>(emptyMap);
  const mapRequestIdRef = useRef(0);
  const [mapData, setMapData] = useState<MapResponse>(emptyMap);
  const [loadingMap, setLoadingMap] = useState(true);
  const [groupOptions, setGroupOptions] = useState<MapGroupOption[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<MapCollectionFilter | null>(null);
  const [collectionFitBoundsTarget, setCollectionFitBoundsTarget] = useState<{
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
    [activeMapMode, satelliteApiKey]
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
      const response = await fetch("/api/friends/list");

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (!ignore) {
        setGroupOptions(buildLightweightMapGroups(data.friends ?? []));
      }
    }

    void loadGroups();

    return () => {
      ignore = true;
    };
  }, []);

  // Load user collections for the filter sidebar
  useEffect(() => {
    let ignore = false;

    async function loadCollections() {
      const response = await fetch("/api/collections");

      if (!response.ok) return;

      const data = await response.json();

      if (!ignore) {
        setCollections(
          (data.collections ?? []).filter((c: CollectionSummary) => c.postCount > 0)
        );
      }
    }

    void loadCollections();

    return () => {
      ignore = true;
    };
  }, []);

  // When a collection is selected, fetch its route points and build the filter
  useEffect(() => {
    if (!selectedCollectionId) {
      setCollectionFilter(null);
      return;
    }

    const selectedCol = collections.find((c) => c.id === selectedCollectionId);

    if (!selectedCol) {
      setCollectionFilter(null);
      return;
    }

    // Capture primitives before async boundary so TS can narrow them
    const colId = selectedCol.id;
    const colName = selectedCol.name;
    const colColor = selectedCol.color ?? "#38B6C9";

    let ignore = false;

    async function loadCollectionRoute() {
      const response = await fetch(`/api/collections/${colId}/route-points`);

      if (!response.ok || ignore) return;

      const data = await response.json();
      const points: Array<{ postId: string; latitude: number; longitude: number; visitedAt: string }> = data.points ?? [];

      if (!ignore) {
        const validPoints = points.filter(
          (p) =>
            isFinite(p.latitude) &&
            isFinite(p.longitude) &&
            p.latitude >= -90 &&
            p.latitude <= 90 &&
            p.longitude >= -180 &&
            p.longitude <= 180
        );
        setCollectionFilter({
          collectionId: colId,
          name: colName,
          color: colColor,
          postIds: new Set(points.map((p) => p.postId)),
          routePoints: points
        });
        if (validPoints.length > 0) {
          setCollectionFitBoundsTarget({ key: colId, points: validPoints });
        }
      }
    }

    void loadCollectionRoute();

    return () => {
      ignore = true;
    };
  }, [selectedCollectionId, collections]);

  useEffect(() => {
    const abortController = new AbortController();
    let ignore = false;
    const requestId = mapRequestIdRef.current + 1;
    mapRequestIdRef.current = requestId;

    async function loadMap() {
      setLoadingMap(true);
      const params = new URLSearchParams({
        north: String(viewport.bounds.north),
        south: String(viewport.bounds.south),
        east: String(viewport.bounds.east),
        west: String(viewport.bounds.west),
        zoom: String(viewport.zoom),
        layer,
        time
      });

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
        setLoadingMap(false);
        return;
      }

      const data = (await response.json().catch(() => null)) as Partial<MapResponse> | null;

      if (!response.ok || !data) {
        if (!ignore && requestId === mapRequestIdRef.current) {
          if (!hasRenderableMapData(latestMapDataRef.current)) {
            setMapData(emptyMap);
          }
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
      setLoadingMap(false);
    }

    void loadMap();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [viewport, deferredQuery, layer, time, selectedGroupIds, selectedCategories]);

  useEffect(() => {
    setPreviewState((currentState) => syncPreviewStateWithMarkers(currentState, mapData.markers));
  }, [mapData.markers]);

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
  const activeFilterCount = (time !== "all" ? 1 : 0) + selectedGroupIds.length + selectedCategories.length + (selectedCollectionId ? 1 : 0);
  const activeSearchQuery = deferredQuery.trim();
  const showEmptySearchState = activeSearchQuery.length > 0 && !loadingMap && mapData.markers.length === 0;
  const minimalCopy = useMemo(
    () =>
      mapData.stage === "world"
        ? "Start from the world. City clusters reveal travel memories as you zoom."
        : "Search, filter, and switch layers while exploring your friends' memory map.",
    [mapData.stage]
  );

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
    setSelectedCollectionId(null);
    setCollectionFilter(null);
    setCollectionFitBoundsTarget(null);
  }

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
    setPendingMapFocusTarget((currentTarget) => clearConsumedMapFocusTarget(currentTarget, focusKey));
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
    <section className="relative isolate min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-[2.2rem] border bg-[var(--surface-soft)] shadow-2xl shadow-black/5">
      <DynamicMapCanvas
        markers={mapData.markers}
        mapMode={activeMapMode}
        mapStyle={mapStyle}
        expandedPostId={expandedPost?.id ?? null}
        selectedLocationMarkerId={selectedLocationMarkerId}
        collectionFilter={collectionFilter}
        collectionFitBoundsTarget={collectionFitBoundsTarget}
        initialViewState={
          mapFocusTarget
            ? {
                longitude: mapFocusTarget.longitude,
                latitude: mapFocusTarget.latitude,
                zoom: 13,
                pitch: 45,
                bearing: 0
              }
            : undefined
        }
        focusedCoordinates={
          mapFocusTarget
            ? {
                latitude: mapFocusTarget.latitude,
                longitude: mapFocusTarget.longitude,
                key: mapFocusTarget.key
              }
            : null
        }
        onExpandPost={handleExpandPost}
        onFocusedCoordinatesApplied={handleFocusedCoordinatesApplied}
        onOpenLocationCluster={handleOpenLocationCluster}
        onMapError={handleMapError}
        onViewportChange={onViewportChange}
      />

      <div className="pointer-events-none absolute inset-0 z-[700]">
        {/* Always-visible Filters button — top-left, no zoom gate */}
        {!previewSurfaceOpen && (
          <div className="pointer-events-auto absolute left-4 top-4 z-10 md:left-5 md:top-5">
            <div className="glass-panel flex w-fit items-center rounded-full p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--foreground)]/5 md:gap-2 md:px-4 md:text-sm"
              >
                <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && <span>({activeFilterCount})</span>}
              </button>
            </div>
          </div>
        )}

        {!previewSurfaceOpen ? (
          <>
            <div className="pointer-events-none flex h-full flex-col justify-between p-4 md:p-5">
              <div className="space-y-4">
                <div className="pointer-events-auto hidden max-w-xl items-center gap-4 rounded-full border bg-[var(--surface-strong)] px-4 py-3 shadow-sm md:inline-flex">
                  <Brand compact />
                  <p className="text-sm text-[var(--foreground)]/62">{minimalCopy}</p>
                </div>

                <div className="pointer-events-auto flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
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
                      {showControls ? (
                        <div className="glass-panel flex w-fit items-center rounded-full p-1 shadow-sm">
                          <LayerToggle value={layer} onChange={setLayer} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {showControls ? (
                    <Link href="/create" className="pointer-events-auto">
                      <Button className="gap-2">
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
              </div>
            </div>

            {(showControls || showWelcomeCard || satelliteToggleVisible) && (
              <div className="pointer-events-none absolute inset-x-4 bottom-24 grid gap-4 md:bottom-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end xl:px-1 animate-in fade-in duration-500 ease-out">
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
                    <FriendActivityPanel items={mapData.friendActivity} layer={layer} />
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
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          onTimeChange={setTime}
          onToggleGroup={toggleGroup}
          onToggleCategory={toggleCategory}
          onSelectCollection={setSelectedCollectionId}
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

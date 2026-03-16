"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Filter, LoaderCircle, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
import { WelcomeCard } from "@/components/map/welcome-card";
import { buildLightweightMapGroups } from "@/lib/map-groups";
import { MAP_MODE_STORAGE_KEY, getMapStyle, isSatelliteModeAvailable, parseStoredMapMode } from "@/lib/map-style";
import { canonicalizeViewportForDataQuery, createViewportFingerprint, FULL_WORLD_BOUNDS, type MapViewport } from "@/lib/map-viewport";
import type { LayerMode, MapCategory, MapGroupOption, MapResponse, MapVisualMode, PostSummary, TimeFilter } from "@/types/app";

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

export function MapPageClient() {
  const searchParams = useSearchParams();
  const didToastSatelliteFallbackRef = useRef(false);
  const [mapData, setMapData] = useState<MapResponse>(emptyMap);
  const [loadingMap, setLoadingMap] = useState(true);
  const [groupOptions, setGroupOptions] = useState<MapGroupOption[]>([]);
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<LayerMode>("both");
  const [mapMode, setMapMode] = useState<MapVisualMode>("default");
  const [mapModeHydrated, setMapModeHydrated] = useState(false);
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const [time, setTime] = useState<TimeFilter>("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<MapCategory[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostSummary | null>(null);
  const [viewport, setViewport] = useState<MapViewport>(() =>
    canonicalizeViewportForDataQuery({
      zoom: 2,
      bounds: FULL_WORLD_BOUNDS
    })
  );
  const deferredQuery = useDeferredValue(query);
  const satelliteModeAvailable = isSatelliteModeAvailable(satelliteApiKey);
  const satelliteToggleVisible = satelliteModeAvailable;
  const satelliteOptionDisabled = satelliteFailed;
  const activeMapMode = satelliteModeAvailable && !satelliteFailed ? mapMode : "default";
  const mapStyle = useMemo(
    () =>
      getMapStyle({
        mode: activeMapMode,
        satelliteApiKey
      }),
    [activeMapMode, satelliteApiKey]
  );

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

  useEffect(() => {
    const abortController = new AbortController();
    let ignore = false;

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
        if (ignore || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        setMapData(emptyMap);
        setLoadingMap(false);
        return;
      }

      const data = (await response.json()) as Partial<MapResponse>;

      if (!response.ok) {
        if (!ignore) {
          setMapData(emptyMap);
          setLoadingMap(false);
        }
        return;
      }

      if (ignore) {
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
    if (!selectedPost) {
      return;
    }

    const stillVisible = mapData.markers.some((marker) => "post" in marker && marker.post.id === selectedPost.id);

    if (!stillVisible) {
      setSelectedPost(null);
    }
  }, [mapData, selectedPost]);

  const showControls = mapData.stage !== "world";
  const showWelcomeCard = mapData.stage === "world" || !mapData.cityContext;
  const forceWelcomeOpen = searchParams.get("welcome") === "1";
  const activeFilterCount = (time !== "all" ? 1 : 0) + selectedGroupIds.length + selectedCategories.length;
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
  }

  const handleMapModeChange = useCallback(
    (nextMode: MapVisualMode) => {
      if (nextMode === "satellite" && satelliteOptionDisabled) {
        return;
      }

      setMapMode(nextMode);
    },
    [satelliteOptionDisabled]
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

  return (
    <section className="relative min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-[2.2rem] border bg-[var(--surface-soft)] shadow-2xl shadow-black/5">
      <DynamicMapCanvas
        markers={mapData.markers}
        mapMode={activeMapMode}
        mapStyle={mapStyle}
        selectedPostId={selectedPost?.id ?? null}
        onExpandPost={setSelectedPost}
        onMapError={handleMapError}
        onViewportChange={onViewportChange}
      />

      <div className="pointer-events-none absolute inset-0 z-[700]">
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
                  ) : null}
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
            {satelliteToggleVisible ? (
              <div className="pointer-events-auto flex justify-end">
                <MapModeToggle
                  value={activeMapMode}
                  onChange={handleMapModeChange}
                  satelliteDisabled={satelliteOptionDisabled}
                />
              </div>
            ) : null}
            {showEmptySearchState ? (
              <div className="pointer-events-auto inline-flex max-w-lg items-center gap-2 rounded-2xl border bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)]/68 shadow-sm">
                <Search className="h-4 w-4 text-[var(--map-accent)]" />
                <span>No places, people, countries, or captions matched that search.</span>
              </div>
            ) : null}
          </div>

        </div>

        {(showControls || showWelcomeCard) && (
          <div className="pointer-events-none absolute inset-x-4 bottom-20 grid gap-4 md:bottom-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end xl:px-1 animate-in fade-in duration-500 ease-out">
            <div className="pointer-events-none flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
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

        <FilterSidebar
          open={filterOpen}
          time={time}
          selectedGroupIds={selectedGroupIds}
          selectedCategories={selectedCategories}
          groupOptions={groupOptions}
          onTimeChange={setTime}
          onToggleGroup={toggleGroup}
          onToggleCategory={toggleCategory}
          onClear={clearFilters}
          onClose={() => setFilterOpen(false)}
        />
      </div>

      <BottomSheet post={selectedPost} onClose={() => setSelectedPost(null)} />
    </section>
  );
}

"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { ChevronRight, Map, Route } from "lucide-react";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  getDirectionsProviderOrder,
  hasValidDirectionsCoordinates,
  type DirectionLocation,
  type DirectionsProvider
} from "@/lib/directions";
import { LocationCountryText } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

type DirectionsSheetProps = {
  post: DirectionLocation;
  label?: string;
  triggerStyle?: "inline" | "secondary" | "emphasis";
  className?: string;
};

const providerCopy: Record<DirectionsProvider, { title: string; subtitle: string }> = {
  apple: {
    title: "Apple Maps",
    subtitle: "Feels most natural on iPhone and Safari."
  },
  google: {
    title: "Google Maps",
    subtitle: "Works well on Android and in the browser."
  }
};

export function DirectionsSheet({
  post,
  label = "Route",
  triggerStyle = "inline",
  className
}: DirectionsSheetProps) {
  const [open, setOpen] = useState(false);
  const [providerOrder, setProviderOrder] = useState<DirectionsProvider[]>(["google", "apple"]);
  const locationAvailable = hasValidDirectionsCoordinates(post);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const platformInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints
    };

    setProviderOrder(getDirectionsProviderOrder(platformInfo));
  }, []);

  const providerLinks = useMemo(
    () =>
      providerOrder
        .map((provider) => {
          const href =
            provider === "apple" ? buildAppleMapsDirectionsUrl(post) : buildGoogleMapsDirectionsUrl(post);

          if (!href) {
            return null;
          }

          return {
            provider,
            href,
            ...providerCopy[provider]
          };
        })
        .filter((provider): provider is NonNullable<typeof provider> => provider !== null),
    [post, providerOrder]
  );
  const drawerStyle = {
    "--pinly-sheet-top-gap": "6rem"
  } as CSSProperties;

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          disabled={!locationAvailable}
          title={!locationAvailable ? "Directions unavailable for this memory" : undefined}
          className={cn(
            triggerStyle === "inline" &&
              "flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[var(--foreground)]/60 transition-colors hover:bg-[var(--foreground)]/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
            triggerStyle === "secondary" &&
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border bg-[var(--card-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50",
            triggerStyle === "emphasis" &&
              "inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(56,182,201,0.24)] bg-[var(--map-accent-soft)] px-3.5 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[rgba(56,182,201,0.22)] disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {triggerStyle === "emphasis" ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--map-accent)] text-white">
              <Route className="h-3.5 w-3.5" />
            </span>
          ) : (
            <Route className="h-4 w-4" />
          )}
          <span>{label}</span>
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[210] bg-black/35 backdrop-blur-sm transition-opacity" />
        <Drawer.Content
          className="pinly-mobile-drawer fixed inset-x-0 z-[210] mt-24 rounded-t-[2.25rem] bg-[var(--surface-strong)] after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]"
          style={drawerStyle}
        >
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-[var(--foreground)]/15" />
          <div className="pinly-sheet-body pb-[calc(var(--keyboard-safe-area-bottom)+1rem)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--map-accent-soft)] text-[var(--map-accent)]">
                <Map className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="pinly-section-title font-[var(--font-serif)]">Open directions</h2>
                <div className="mt-1 flex min-w-0 max-w-full items-center gap-1 text-sm text-[var(--foreground)]/62">
                  <span className="truncate">{post.placeName},</span>
                  <LocationCountryText city={post.city} country={post.country} className="min-w-0 max-w-full" />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {providerLinks.map((provider) => (
                <a
                  key={provider.provider}
                  href={provider.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-4 rounded-[1.5rem] border bg-[var(--surface-soft)] px-4 py-4 text-left transition hover:border-[rgba(56,182,201,0.24)] hover:bg-[var(--map-accent-soft)] active:scale-[0.99]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--map-accent)] shadow-sm">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)]">{provider.title}</p>
                    <p className="mt-0.5 text-sm text-[var(--foreground)]/58">{provider.subtitle}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--foreground)]/35" />
                </a>
              ))}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

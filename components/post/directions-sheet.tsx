"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { ChevronRight, Map, Route } from "lucide-react";
import type { PostSummary } from "@/types/app";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  getDirectionsProviderOrder,
  hasValidDirectionsCoordinates,
  type DirectionsProvider
} from "@/lib/directions";
import { cn } from "@/lib/utils";

type DirectionsSheetProps = {
  post: Pick<PostSummary, "placeName" | "city" | "country" | "latitude" | "longitude">;
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
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[210] mt-24 rounded-t-[2.25rem] bg-[var(--surface-strong)] pb-safe after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]">
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-[var(--foreground)]/15" />
          <div className="px-5 pb-8 pt-5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--map-accent-soft)] text-[var(--map-accent)]">
                <Map className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-[var(--font-serif)] text-2xl font-semibold">Open directions</h2>
                <p className="mt-1 text-sm text-[var(--foreground)]/62">
                  {post.placeName}, {post.city}, {post.country}
                </p>
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

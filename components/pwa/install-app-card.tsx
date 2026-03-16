"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, Share, SquarePlus, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  detectInstallPlatform,
  getInstallInstructions,
  isStandaloneLike,
  type InstallPlatform
} from "@/lib/pwa-install";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

export function InstallAppCard({ className }: { className?: string }) {
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [prompting, setPrompting] = useState(false);

  const instructions = useMemo(() => getInstallInstructions(platform), [platform]);
  const canPromptInstall = !installed && !!deferredPrompt;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const platformValue = detectInstallPlatform(window.navigator.userAgent);
    setPlatform(platformValue);

    const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");
    const updateInstalledState = () => {
      setInstalled(
        isStandaloneLike(
          standaloneMediaQuery.matches,
          (window.navigator as Navigator & { standalone?: boolean }).standalone
        )
      );
    };

    updateInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowInstructions(false);
      toast.success("Pinly is ready on your Home Screen.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (typeof standaloneMediaQuery.addEventListener === "function") {
      standaloneMediaQuery.addEventListener("change", updateInstalledState);
    } else {
      standaloneMediaQuery.addListener(updateInstalledState);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (typeof standaloneMediaQuery.removeEventListener === "function") {
        standaloneMediaQuery.removeEventListener("change", updateInstalledState);
      } else {
        standaloneMediaQuery.removeListener(updateInstalledState);
      }
    };
  }, []);

  async function handleInstallClick() {
    if (installed) {
      setShowInstructions(false);
      return;
    }

    if (!deferredPrompt) {
      setShowInstructions((current) => !current);
      return;
    }

    setPrompting(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        toast.success("Pinly install started.");
      } else {
        toast("Install dismissed. You can try again any time.");
      }
    } finally {
      setPrompting(false);
      setDeferredPrompt(null);
    }
  }

  return (
    <div
      id="install-app"
      className={cn("rounded-[1.5rem] border bg-[var(--surface-soft)] p-4", className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(56,182,201,0.12)] text-[var(--map-accent)]">
          {installed ? <CheckCircle2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Add Pinly to Home Screen</p>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground)]/58">
            {installed
              ? "Pinly is already installed on this device."
              : canPromptInstall
                ? "Save Pinly like an app for faster opening and a cleaner full-screen feel on your phone."
                : instructions.summary}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          className="w-full gap-2 bg-[var(--map-accent)] text-[var(--foreground)] hover:opacity-95 focus:ring-[var(--map-accent)] sm:w-auto"
          onClick={() => {
            void handleInstallClick();
          }}
          disabled={prompting}
        >
          {prompting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {installed ? "Already added" : "Add to Home Screen"}
        </Button>
        {!installed ? (
          <p className="text-xs text-[var(--foreground)]/52">
            {canPromptInstall
              ? "This device can show the install prompt directly."
              : platform === "ios-safari"
                ? "iPhone Safari uses Share, then Add to Home Screen."
                : "If no prompt appears, we’ll show the right manual steps."}
          </p>
        ) : null}
      </div>

      {(showInstructions || installed) && (
        <div className="mt-4 rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--foreground)]/8 text-[var(--foreground)]">
              {platform.startsWith("ios") ? <Share className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-medium">
                {installed ? "Pinly is already on your Home Screen" : "How to add Pinly"}
              </p>
              <p className="text-xs text-[var(--foreground)]/55">
                {installed
                  ? "Open it like an app from your phone Home Screen."
                  : platform === "ios-safari"
                    ? "Safari handles Home Screen installs manually."
                    : "These steps help when a direct prompt is unavailable."}
              </p>
            </div>
          </div>

          {!installed ? (
            <ol className="mt-3 space-y-2 text-sm text-[var(--foreground)]/72">
              {instructions.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[11px] font-semibold text-[var(--foreground)]/72">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(56,182,201,0.18)] bg-[rgba(56,182,201,0.08)] px-3 py-1.5 text-sm text-[var(--foreground)]">
              <SquarePlus className="h-4 w-4 text-[var(--map-accent)]" />
              Ready for quick app-like access.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

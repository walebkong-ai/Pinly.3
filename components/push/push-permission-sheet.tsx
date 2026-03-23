"use client";

import { BellRing, MapPinned, MessageCircleHeart } from "lucide-react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";

type PushPermissionSheetProps = {
  open: boolean;
  requesting: boolean;
  onEnable: () => void;
  onOpenChange: (open: boolean) => void;
};

export function PushPermissionSheet({
  open,
  requesting,
  onEnable,
  onOpenChange
}: PushPermissionSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[220] bg-black/38 backdrop-blur-sm transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[220] mt-24 rounded-t-[2.5rem] bg-[var(--surface-strong)] pb-safe after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-5 pb-8 pt-4">
            <div className="mx-auto h-1.5 w-14 rounded-full bg-[var(--foreground)]/12" />

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.4rem] bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/42">Stay in the loop</p>
                <h2 className="mt-1 font-[var(--font-serif)] text-2xl">Turn on real activity alerts</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/64">
                  Pinly can notify you when a memory gets liked, someone comments, or a friend request is accepted.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageCircleHeart className="h-4 w-4 text-[var(--social-accent)]" />
                  Comments and friend activity
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/60">
                  Know when someone responds while the memory is still fresh.
                </p>
              </div>
              <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPinned className="h-4 w-4 text-[var(--map-accent)]" />
                  Open the right place instantly
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/60">
                  Notification taps can jump you straight into the post, friends screen, or map context.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="h-12 flex-1" onClick={onEnable} disabled={requesting}>
                {requesting ? "Enabling..." : "Enable alerts"}
              </Button>
              <Button variant="secondary" className="h-12 flex-1" onClick={() => onOpenChange(false)} disabled={requesting}>
                Not now
              </Button>
            </div>

            <p className="text-xs leading-5 text-[var(--foreground)]/46">
              You can keep using Pinly normally if you skip this, and you can turn alerts on later from Settings.
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

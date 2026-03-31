"use client";

import { type CSSProperties, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, LoaderCircle } from "lucide-react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CollectionColorPicker } from "@/components/collections/collection-color-picker";
import { CollectionVisibilitySelector } from "@/components/collections/collection-visibility-selector";
import type { CollectionVisibility } from "@/types/app";

export function CreateCollectionButton({
  label = "New collection",
  variant = "secondary",
  className
}: {
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<CollectionVisibility>("private");
  const [isPending, startTransition] = useTransition();
  const drawerStyle = {
    "--pinly-sheet-top-gap": "6rem"
  } as CSSProperties;

  function handleCreate() {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, color, visibility })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Could not create collection.");
        }

        const data = await response.json();
        setOpen(false);
        setName("");
        setColor(null);
        setVisibility("private");
        router.push(`/collections/${data.collection.id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create collection.");
      }
    });
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button type="button" variant={variant} className={cn("rounded-full", className)}>
          <FolderPlus className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity" />
        <Drawer.Content
          className="pinly-mobile-drawer fixed inset-x-0 z-[200] mt-24 rounded-t-[2.5rem] bg-[var(--surface-strong)] after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]"
          style={drawerStyle}
        >
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-[var(--foreground)]/15" />
          <div className="pinly-sheet-body">
            <h3 className="pinly-section-title font-[var(--font-serif)]">Create a collection</h3>
            <p className="mt-1 text-sm text-[var(--foreground)]/58">
              Start a folder for a trip, season, or any set of memories you want grouped together.
            </p>
            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--foreground)]/45">
                  Collection name
                </label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Summer 2026"
                  className="h-12 rounded-2xl"
                />
              </div>
              <CollectionColorPicker value={color} onChange={setColor} />
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--foreground)]/45">
                  Privacy
                </label>
                <CollectionVisibilitySelector value={visibility} onChange={setVisibility} disabled={isPending} />
              </div>
            </div>
            <Button
              type="button"
              className="mt-6 w-full rounded-2xl"
              onClick={handleCreate}
              disabled={isPending || name.trim().length < 2}
            >
              {isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
              Create collection
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

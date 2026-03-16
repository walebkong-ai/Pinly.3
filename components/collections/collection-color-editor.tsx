"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CollectionColorPicker } from "@/components/collections/collection-color-picker";

export function CollectionColorEditor({
  collectionId,
  initialColor
}: {
  collectionId: string;
  initialColor: string | null;
}) {
  const router = useRouter();
  const [color, setColor] = useState<string | null>(initialColor);
  const [isPending, startTransition] = useTransition();

  function handleColorChange(next: string | null) {
    setColor(next);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/collections/${collectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: next })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Could not update color.");
        }

        router.refresh();
      } catch (error) {
        // Revert on failure
        setColor(initialColor);
        toast.error(error instanceof Error ? error.message : "Could not update color.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <CollectionColorPicker value={color} onChange={handleColorChange} />
      {isPending && (
        <span className="text-xs text-[var(--foreground)]/40">Saving…</span>
      )}
    </div>
  );
}

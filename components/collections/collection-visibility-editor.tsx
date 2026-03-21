"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { CollectionVisibilitySelector } from "@/components/collections/collection-visibility-selector";
import type { CollectionVisibility } from "@/types/app";

export function CollectionVisibilityEditor({
  collectionId,
  initialVisibility
}: {
  collectionId: string;
  initialVisibility: CollectionVisibility;
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<CollectionVisibility>(initialVisibility);
  const [isPending, startTransition] = useTransition();

  function handleVisibilityChange(next: CollectionVisibility) {
    if (next === visibility) return;
    
    const previous = visibility;
    setVisibility(next);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/collections/${collectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: next })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Could not update visibility.");
        }

        router.refresh();
      } catch (error) {
        setVisibility(previous);
        toast.error(error instanceof Error ? error.message : "Could not update visibility.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40">
          Visibility
        </span>
        {isPending && (
          <LoaderCircle className="h-3 w-3 animate-spin text-[var(--foreground)]/40" />
        )}
      </div>
      <CollectionVisibilitySelector 
        value={visibility} 
        onChange={handleVisibilityChange} 
        disabled={isPending} 
      />
    </div>
  );
}

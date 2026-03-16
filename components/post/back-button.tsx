"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canUseHistoryBack } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function BackButton({
  fallbackHref = "/map",
  label = "Back",
  className
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (
      typeof window !== "undefined" &&
      canUseHistoryBack(window.history.length, document.referrer, window.location.origin)
    ) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  }

  return (
    <Button 
      variant="ghost" 
      onClick={handleBack} 
      className={cn(
        "group mb-2 h-9 gap-2 -ml-2 rounded-2xl text-[var(--foreground)]/60 transition hover:bg-black/5 hover:text-[var(--foreground)]",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      {label}
    </Button>
  );
}

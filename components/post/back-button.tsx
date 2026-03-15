"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/map");
    }
  }

  return (
    <Button 
      variant="ghost" 
      onClick={handleBack} 
      className="group mb-2 h-9 gap-2 -ml-2 rounded-2xl text-[var(--foreground)]/60 transition hover:bg-black/5 hover:text-[var(--foreground)]"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      Back
    </Button>
  );
}

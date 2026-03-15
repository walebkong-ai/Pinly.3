"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DeletePostButton({ postId, redirectToMap }: { postId: string, redirectToMap?: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this memory? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Memory deleted.");
      
      if (redirectToMap) {
        router.push("/map");
        router.refresh();
      } else {
        router.refresh(); // Or reload to update the feed visually
      }
    } catch (err) {
      toast.error("Failed to delete memory.");
      setIsDeleting(false);
    }
  }

  return (
    <Button 
      variant="danger" 
      onClick={handleDelete} 
      disabled={isDeleting}
      className="h-9 gap-2 rounded-2xl bg-[rgba(180,35,24,0.1)] px-3 text-[var(--danger)] hover:bg-[rgba(180,35,24,0.16)]"
    >
      {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Delete
    </Button>
  );
}

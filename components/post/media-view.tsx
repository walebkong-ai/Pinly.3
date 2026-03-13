import Image from "next/image";
import { cn } from "@/lib/utils";

export function MediaView({
  mediaType,
  mediaUrl,
  thumbnailUrl,
  className
}: {
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  if (mediaType === "VIDEO") {
    return (
      <video
        className={cn("h-full w-full rounded-[1.5rem] object-cover", className)}
        controls
        poster={thumbnailUrl ?? undefined}
        preload="metadata"
      >
        <source src={mediaUrl} />
      </video>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-[1.5rem]", className)}>
      <Image src={mediaUrl} alt="" fill className="object-cover" />
    </div>
  );
}

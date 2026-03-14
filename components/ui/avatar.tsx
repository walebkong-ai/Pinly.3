import Image from "next/image";
import { cn, getMediaProxyUrl } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const proxyUrl = getMediaProxyUrl(src);

  if (proxyUrl) {
    return (
      <div className={cn("relative h-10 w-10 overflow-hidden rounded-full border bg-white", className)}>
        <Image 
          src={proxyUrl} 
          alt={name} 
          fill 
          className="object-cover" 
          unoptimized={proxyUrl.startsWith("/api/media")}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--accent-soft)] text-sm font-semibold uppercase",
        className
      )}
    >
      {name.slice(0, 2)}
    </div>
  );
}

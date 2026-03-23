import { cn } from "@/lib/utils";

export function Skeleton({
  className
}: {
  className?: string;
}) {
  return <div className={cn("pinly-skeleton rounded-[1.25rem]", className)} aria-hidden="true" />;
}

import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="glass-panel rounded-[1.75rem] p-4">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="mt-3 h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
      </section>

      {Array.from({ length: 3 }).map((_, index) => (
        <section key={index} className="glass-panel rounded-[1.75rem] p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
          <Skeleton className="mt-4 h-64 w-full rounded-[1.5rem]" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </section>
      ))}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-[2rem] p-3">
        <Skeleton className="h-[68vh] w-full rounded-[1.75rem]" />
      </section>

      <section className="glass-panel rounded-[2rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
    </div>
  );
}

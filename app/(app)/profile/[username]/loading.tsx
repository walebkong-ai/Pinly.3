import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="grid gap-4">
      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-24" />
            <Skeleton className="h-20 w-24" />
            <Skeleton className="h-20 w-24" />
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-5">
        <Skeleton className="h-6 w-40" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-[1.75rem]" />
          ))}
        </div>
      </section>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export const TeamMemberSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between p-5 rounded-lg bg-muted/30">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" delay={(i - 1) * 100} />
            <Skeleton className="h-4 w-32" delay={(i - 1) * 100 + 50} />
            <Skeleton className="h-3 w-48" delay={(i - 1) * 100 + 100} />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" delay={(i - 1) * 100 + 150} />
            <Skeleton className="h-9 w-9" delay={(i - 1) * 100 + 200} />
            <Skeleton className="h-9 w-9" delay={(i - 1) * 100 + 250} />
          </div>
        </div>
      ))}
    </div>
  );
};

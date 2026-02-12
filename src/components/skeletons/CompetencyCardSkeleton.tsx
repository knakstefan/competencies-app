import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const CompetencyCardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-12" delay={0} />
          <Skeleton className="h-7 w-48" delay={100} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-16" delay={150 * i} />
                <Skeleton className="h-5 w-40" delay={150 * i + 50} />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" delay={150 * i + 100} />
                <Skeleton className="h-4 w-5/6" delay={150 * i + 150} />
                <Skeleton className="h-4 w-4/6" delay={150 * i + 200} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProgressViewSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Overall Assessment Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" delay={0} />
            <Skeleton className="h-6 w-24" delay={100} />
          </div>
          <Skeleton className="h-4 w-32 mt-2" delay={200} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[400px] flex items-center justify-center">
            <Skeleton className="h-80 w-80 rounded-full" delay={300} />
          </div>
          <div className="border-t pt-4 space-y-2">
            <Skeleton className="h-4 w-full" delay={400} />
            <Skeleton className="h-3 w-3/4" delay={500} />
          </div>
        </CardContent>
      </Card>

      {/* Competency Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-7 w-64" delay={500 + i * 100} />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((j) => (
                <div key={j} className="p-5 rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <Skeleton className="h-5 w-56" delay={500 + i * 100 + j * 50} />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-20" delay={500 + i * 100 + j * 50 + 50} />
                      <Skeleton className="h-8 w-16" delay={500 + i * 100 + j * 50 + 100} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-4 w-full" delay={500 + i * 100 + j * 50 + 150} />
                    <Skeleton className="h-4 w-5/6" delay={500 + i * 100 + j * 50 + 200} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

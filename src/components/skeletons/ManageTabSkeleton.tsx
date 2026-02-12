import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ManageTabSkeleton = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" delay={0} />
          <Skeleton className="h-4 w-96" delay={100} />
        </div>
        <Skeleton className="h-10 w-40" delay={200} />
      </div>

      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Skeleton className="h-9 w-9" delay={250 + i * 200} />
              <Skeleton className="h-9 w-9" delay={250 + i * 200 + 50} />
            </div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-16" delay={250 + i * 200 + 100} />
                  <Skeleton className="h-7 w-48" delay={250 + i * 200 + 150} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[1, 2].map((j) => (
                    <div key={j} className="rounded-xl p-5 bg-muted/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Skeleton className="h-6 w-16" delay={250 + i * 200 + j * 100} />
                          <Skeleton className="h-6 w-64" delay={250 + i * 200 + j * 100 + 50} />
                        </div>
                        <Skeleton className="h-9 w-20" delay={250 + i * 200 + j * 100 + 100} />
                      </div>
                      <div className="space-y-4">
                        {[1, 2, 3].map((k) => (
                          <div key={k} className="rounded-lg p-4 bg-muted/40">
                            <div className="flex items-center justify-between mb-2">
                              <Skeleton className="h-5 w-32" delay={250 + i * 200 + j * 100 + k * 50} />
                              <Skeleton className="h-8 w-16" delay={250 + i * 200 + j * 100 + k * 50 + 25} />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-full" delay={250 + i * 200 + j * 100 + k * 50 + 50} />
                              <Skeleton className="h-4 w-5/6" delay={250 + i * 200 + j * 100 + k * 50 + 75} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

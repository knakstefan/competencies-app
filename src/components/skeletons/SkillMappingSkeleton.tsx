import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const SkillMappingSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" delay={0} />
          <Skeleton className="h-6 w-24" delay={100} />
        </div>
        <Skeleton className="h-4 w-64 mt-2" delay={200} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[500px] flex items-center justify-center">
          <Skeleton className="h-96 w-96 rounded-full" delay={300} />
        </div>
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded-full" delay={400 + i * 50} />
                <Skeleton className="h-4 w-32" delay={400 + i * 50 + 25} />
              </div>
            ))}
          </div>
          <Skeleton className="h-3 w-full mt-4" delay={700} />
        </div>
      </CardContent>
    </Card>
  );
};

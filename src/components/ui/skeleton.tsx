import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
}

function Skeleton({ className, delay = 0, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-skeleton-pulse rounded-lg bg-muted/60", className)}
      style={{ animationDelay: `${delay}ms` }}
      {...props}
    />
  );
}

export { Skeleton };

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { OverallStats } from "./types";

interface PerformanceSnapshotProps {
  overallStats: OverallStats;
  completedCount: number;
  dateRange: { from: string; to: string } | null;
  overallTrend: string | null;
}

export function PerformanceSnapshot({
  overallStats,
  completedCount,
  dateRange,
  overallTrend,
}: PerformanceSnapshotProps) {
  const hasData = overallStats.total > 0;
  const abovePct = hasData ? Math.round((overallStats.above / overallStats.total) * 100) : 0;
  const targetPct = hasData ? Math.round((overallStats.target / overallStats.total) * 100) : 0;
  const belowPct = hasData ? Math.round((overallStats.below / overallStats.total) * 100) : 0;

  return (
    <Card className="relative overflow-hidden">
      <div className="h-0.5 bg-gradient-knak" />
      <CardContent className="p-5">
        <div className="flex flex-col items-center gap-4">
          {/* Score */}
          <div className="text-center">
            <div className="text-5xl font-bold tracking-tight">
              {hasData ? overallStats.score.toFixed(1) : "\u2014"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">/ 5.0 overall</div>
          </div>

          {/* Distribution bar with inline legend */}
          {hasData && (
            <div className="w-full space-y-1.5">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                {abovePct > 0 && (
                  <div className="h-full bg-green-500" style={{ width: `${abovePct}%` }} />
                )}
                {targetPct > 0 && (
                  <div className="h-full bg-primary" style={{ width: `${targetPct}%` }} />
                )}
                {belowPct > 0 && (
                  <div className="h-full bg-orange-500" style={{ width: `${belowPct}%` }} />
                )}
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Above {abovePct}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Target {targetPct}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Below {belowPct}%
                </span>
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap justify-center">
            <span>
              Based on {completedCount} assessment
              {completedCount !== 1 ? "s" : ""}
              {dateRange && completedCount > 1
                ? ` (${dateRange.from} \u2013 ${dateRange.to})`
                : ""}
            </span>
            {overallTrend && (
              <>
                <div className="w-px h-3 bg-border" />
                <Badge
                  variant={
                    overallTrend === "Improving"
                      ? "default"
                      : overallTrend === "Declining"
                        ? "destructive"
                        : "secondary"
                  }
                  className={`text-xs ${overallTrend === "Improving" ? "bg-green-600" : ""}`}
                >
                  {overallTrend === "Improving" && <TrendingUp className="w-3 h-3 mr-1" />}
                  {overallTrend === "Declining" && <TrendingDown className="w-3 h-3 mr-1" />}
                  {overallTrend === "Stable" && <Minus className="w-3 h-3 mr-1" />}
                  {overallTrend}
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

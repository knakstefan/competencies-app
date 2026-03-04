import { Competency, SubCompetency } from "@/types/competency";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

interface AISummary {
  overallNarrative: string;
  strengths: Array<{ competency: string; detail: string }>;
  areasNeedingSupport: Array<{
    competency: string;
    subCompetency: string;
    criterion: string;
    rating: string;
    currentLevelExpectation: string;
    nextLevelExpectation: string;
    guidance: string;
  }>;
  overallReadiness: string;
}

interface AssessmentSummaryProps {
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  assessmentData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }>;
  aiSummary?: AISummary | null;
  aiSummaryLoading?: boolean;
}

export const AssessmentSummary = ({
  competencies,
  subCompetencies,
  assessmentData,
  aiSummary,
  aiSummaryLoading,
}: AssessmentSummaryProps) => {
  // Helper to convert evaluation to numeric score (5-point scale)
  const evaluationToScore = (evaluation: string): number => {
    switch (evaluation) {
      case "well_above": return 5;
      case "above": return 4;
      case "target": return 3;
      case "below": return 2;
      case "well_below": return 1;
      default: return 3;
    }
  };

  // Calculate overall stats
  let totalEvaluations = 0;
  let totalScore = 0;
  let aboveCount = 0;
  let targetCount = 0;
  let belowCount = 0;
  const belowItems: { competency: string; criterion: string }[] = [];

  // Per-competency summaries
  const competencySummaries = competencies
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((comp) => {
      const compSubs = subCompetencies.filter((sc) => sc.competencyId === comp._id);
      let compAbove = 0, compTarget = 0, compBelow = 0, compTotal = 0;

      compSubs.forEach((sc) => {
        const data = assessmentData[sc._id];
        if (data?.evaluations) {
          Object.entries(data.evaluations).forEach(([criterion, evaluation]) => {
            compTotal++;
            totalEvaluations++;
            const score = evaluationToScore(evaluation);
            totalScore += score;

            if (evaluation === "below" || evaluation === "well_below") {
              compBelow++;
              belowCount++;
              belowItems.push({ competency: comp.title, criterion });
            } else if (evaluation === "above" || evaluation === "well_above") {
              compAbove++;
              aboveCount++;
            } else {
              compTarget++;
              targetCount++;
            }
          });
        }
      });

      let status: "excelling" | "on-track" | "needs-support" | "not-assessed" = "not-assessed";
      if (compTotal > 0) {
        if (compBelow > 0) status = "needs-support";
        else if (compAbove > compTotal * 0.5) status = "excelling";
        else status = "on-track";
      }

      return { comp, status, total: compTotal };
    });

  const averageScore = totalEvaluations > 0 ? totalScore / totalEvaluations : 0;
  const abovePercent = totalEvaluations > 0 ? (aboveCount / totalEvaluations) * 100 : 0;
  const targetPercent = totalEvaluations > 0 ? (targetCount / totalEvaluations) * 100 : 0;
  const belowPercent = totalEvaluations > 0 ? (belowCount / totalEvaluations) * 100 : 0;

  let overallTrend: "level-up" | "on-track" | "needs-support" = "on-track";
  if (averageScore >= 4.0) overallTrend = "level-up";
  else if (averageScore < 2.5) overallTrend = "needs-support";

  const getTrendVariant = (trend: string) => {
    if (trend === "level-up") return "default" as const;
    if (trend === "needs-support") return "destructive" as const;
    return "secondary" as const;
  };

  const getTrendLabel = (trend: string) => {
    if (trend === "level-up") return "Progressing";
    if (trend === "needs-support") return "Needs Support";
    return "On Track";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excelling":
        return <Badge variant="default" className="bg-green-600 text-xs">Excelling</Badge>;
      case "needs-support":
        return <Badge variant="destructive" className="text-xs">Needs Support</Badge>;
      case "on-track":
        return <Badge variant="secondary" className="text-xs">On Track</Badge>;
      default:
        return <span className="text-xs text-muted-foreground">Not assessed</span>;
    }
  };

  const getRatingBadge = (rating: string) => {
    const isWellBelow = rating.toLowerCase().includes("well below");
    return (
      <Badge variant="destructive" className={`text-xs ${isWellBelow ? "bg-red-600" : "bg-orange-600"}`}>
        {rating}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall score + stacked bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant={getTrendVariant(overallTrend)} className="text-sm px-3 py-1">
            {getTrendLabel(overallTrend)}
          </Badge>
          {totalEvaluations > 0 && (
            <span className="text-sm text-muted-foreground">
              {averageScore.toFixed(1)} / 5.0 avg across {totalEvaluations} criteria
            </span>
          )}
        </div>

        {totalEvaluations > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {abovePercent > 0 && (
                <div className="h-full bg-green-500" style={{ width: `${abovePercent}%` }} />
              )}
              {targetPercent > 0 && (
                <div className="h-full bg-primary" style={{ width: `${targetPercent}%` }} />
              )}
              {belowPercent > 0 && (
                <div className="h-full bg-orange-500" style={{ width: `${belowPercent}%` }} />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Above {Math.round(abovePercent)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                At Target {Math.round(targetPercent)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Below {Math.round(belowPercent)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Competency rows */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold mb-2">By Competency</h3>
        {competencySummaries.map(({ comp, status }) => (
          <div key={comp._id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30">
            <span className="text-sm">{comp.title}</span>
            {getStatusBadge(status)}
          </div>
        ))}
      </div>

      {/* AI Summary Section */}
      {aiSummaryLoading && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Generating AI assessment summary...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {aiSummary && !aiSummaryLoading && (
        <>
          {/* Overall Narrative */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">AI Assessment Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiSummary.overallNarrative}
            </p>
          </div>

          {/* Strengths */}
          {aiSummary.strengths.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Strengths</h3>
              <div className="space-y-2">
                {aiSummary.strengths.map((strength, idx) => (
                  <div key={idx} className="py-2 px-3 rounded-md bg-green-500/5 border border-green-500/10">
                    <p className="text-sm font-medium text-green-400">{strength.competency}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{strength.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Development Guidance (AI-powered) */}
          {aiSummary.areasNeedingSupport.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Development Guidance</h3>
              <div className="space-y-3">
                {aiSummary.areasNeedingSupport.map((item, idx) => (
                  <div key={idx} className="py-3 px-3 rounded-md bg-orange-500/5 border border-orange-500/10 space-y-2">
                    <div className="flex items-start gap-2">
                      {getRatingBadge(item.rating)}
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{item.competency}</span>
                        <span className="text-sm text-muted-foreground"> / {item.subCompetency}</span>
                      </div>
                    </div>
                    <p className="text-sm">{item.criterion}</p>
                    <div className="border-l-2 border-orange-500/30 pl-3 space-y-1.5">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Current level expectation</p>
                        <p className="text-sm">{item.currentLevelExpectation}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Next level expectation</p>
                        <p className="text-sm">{item.nextLevelExpectation}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-primary">Guidance</p>
                        <p className="text-sm text-muted-foreground">{item.guidance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Readiness */}
          {aiSummary.overallReadiness && (
            <div className="py-2 px-3 rounded-md bg-muted/30 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Readiness for Next Level</p>
              <p className="text-sm">{aiSummary.overallReadiness}</p>
            </div>
          )}
        </>
      )}

      {/* Static fallback: Below-target items (only when AI summary not available) */}
      {!aiSummary && !aiSummaryLoading && belowItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Areas Needing Support</h3>
          <div className="space-y-1.5">
            {belowItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 text-sm py-1.5 px-3 rounded-md bg-orange-500/5">
                <span className="text-orange-400 shrink-0">-</span>
                <div>
                  <span className="text-muted-foreground">{item.competency}: </span>
                  <span>{item.criterion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

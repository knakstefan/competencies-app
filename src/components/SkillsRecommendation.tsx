import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightbulb,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

interface SubCompetencyScore {
  subCompetencyId: string;
  title: string;
  avgScore: number;
  evalCount: number;
}

interface CompetencyScore {
  competencyId: string;
  competencyTitle: string;
  avgScore: number;
  maxScore: number;
  priority: "not_assessed" | "high" | "medium" | "strength";
  memberCount: number;
  subScores: SubCompetencyScore[];
}

const LEVEL_BASE_SCORES: Record<string, number> = {
  associate: 2,
  intermediate: 4,
  senior: 6,
  lead: 8,
  principal: 10,
};

const EVALUATION_MODIFIERS: Record<string, number> = {
  well_below: -2,
  below: -1,
  target: 0,
  above: 2,
  well_above: 4,
};

const getStrengthLabel = (avgScore: number, maxScore: number) => {
  const ratio = avgScore / maxScore;
  if (ratio < 0.3) return "Very weak";
  if (ratio < 0.45) return "Weak";
  if (ratio < 0.55) return "Below average";
  if (ratio < 0.7) return "Average";
  if (ratio < 0.85) return "Above average";
  return "Strong";
};

const getStrengthDots = (avgScore: number, maxScore: number) => {
  const ratio = avgScore / maxScore;
  if (ratio < 0.3) return 1;
  if (ratio < 0.45) return 2;
  if (ratio < 0.6) return 3;
  if (ratio < 0.75) return 4;
  return 5;
};

interface SkillsRecommendationProps {
  roleId?: string;
}

export const SkillsRecommendation = ({ roleId }: SkillsRecommendationProps = {}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStrengths, setShowStrengths] = useState(false);

  const globalData = useQuery(
    api.teamSkillData.getTeamSkillData,
    roleId ? "skip" : {}
  );
  const roleData = useQuery(
    api.teamSkillData.getTeamSkillDataByRole,
    roleId ? { roleId: roleId as any } : "skip"
  );
  const teamSkillData = roleId ? roleData : globalData;

  const loading = teamSkillData === undefined;

  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="h-0.5 bg-gradient-knak" />
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const {
    members,
    competencies,
    subCompetencies,
    latestAssessmentByMember,
    allProgress,
    allEvaluations,
  } = teamSkillData;

  if (members.length === 0) {
    return (
      <Card className="relative overflow-hidden">
        <div className="h-0.5 bg-gradient-knak" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-warning" />
            Skills to Look For
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-center text-muted-foreground py-4 text-sm">
            Add team members and complete assessments to see hiring recommendations based on team gaps.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build lookup maps
  const evaluationsByProgress = new Map<string, any[]>();
  allEvaluations.forEach((e: any) => {
    if (!evaluationsByProgress.has(e.progressId)) {
      evaluationsByProgress.set(e.progressId, []);
    }
    evaluationsByProgress.get(e.progressId)!.push(e);
  });

  const subCompToCompetency = new Map<string, string>();
  const subCompTitleMap = new Map<string, string>();
  subCompetencies.forEach((sc: any) => {
    subCompToCompetency.set(sc._id, sc.competencyId);
    subCompTitleMap.set(sc._id, sc.title);
  });

  // Determine max possible score from team composition
  const maxPossibleScore = Math.max(
    ...members.map((m: any) => {
      const base = LEVEL_BASE_SCORES[m.role.toLowerCase()] || 4;
      return base + 4;
    }),
    6
  );

  // Calculate scores per competency AND per sub-competency
  const competencyScores: CompetencyScore[] = competencies.map((comp: any) => {
    let totalScore = 0;
    let memberCount = 0;

    const subScoreAccumulator = new Map<
      string,
      { total: number; count: number; evalCount: number }
    >();

    members.forEach((member: any) => {
      const latestAssessmentId = latestAssessmentByMember[member._id];
      if (!latestAssessmentId) return;

      const memberProgress = allProgress.filter(
        (p: any) =>
          p.assessmentId === latestAssessmentId &&
          subCompToCompetency.get(p.subCompetencyId) === comp._id
      );

      if (memberProgress.length === 0) return;

      const memberLevel = member.role.toLowerCase();
      const baseScore = LEVEL_BASE_SCORES[memberLevel] || 4;

      let totalModifier = 0;
      let evalCount = 0;

      memberProgress.forEach((progress: any) => {
        const evaluations = evaluationsByProgress.get(progress._id) || [];

        let subMod = 0;
        let subEvalCount = 0;
        evaluations.forEach((evaluation: any) => {
          evalCount++;
          subEvalCount++;
          const mod = EVALUATION_MODIFIERS[evaluation.evaluation] || 0;
          totalModifier += mod;
          subMod += mod;
        });

        if (subEvalCount > 0) {
          const subId = progress.subCompetencyId;
          const existing = subScoreAccumulator.get(subId) || {
            total: 0,
            count: 0,
            evalCount: 0,
          };
          const avgMod = subMod / subEvalCount;
          existing.total += Math.max(0, Math.min(14, baseScore + avgMod));
          existing.count += 1;
          existing.evalCount += subEvalCount;
          subScoreAccumulator.set(subId, existing);
        }
      });

      if (evalCount > 0) {
        const avgModifier = totalModifier / evalCount;
        const memberScore = Math.max(0, Math.min(14, baseScore + avgModifier));
        totalScore += memberScore;
        memberCount++;
      }
    });

    const avgScore = memberCount > 0 ? totalScore / memberCount : 0;

    const subScores: SubCompetencyScore[] = [];
    subScoreAccumulator.forEach((data, subId) => {
      subScores.push({
        subCompetencyId: subId,
        title: subCompTitleMap.get(subId) || "Unknown",
        avgScore: data.count > 0 ? data.total / data.count : 0,
        evalCount: data.evalCount,
      });
    });
    subScores.sort((a, b) => a.avgScore - b.avgScore);

    let priority: "not_assessed" | "high" | "medium" | "strength";
    if (memberCount === 0) {
      priority = "not_assessed";
    } else if (avgScore < 4) {
      priority = "high";
    } else if (avgScore < 6) {
      priority = "medium";
    } else {
      priority = "strength";
    }

    return {
      competencyId: comp._id,
      competencyTitle: comp.title,
      avgScore,
      maxScore: maxPossibleScore,
      priority,
      memberCount,
      subScores,
    };
  });

  // Sort weakest first
  const priorityOrder = { not_assessed: 0, high: 1, medium: 2, strength: 3 };
  competencyScores.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.avgScore - b.avgScore;
  });

  const hasData = competencyScores.some(
    (r) => r.avgScore > 0 || r.memberCount === 0
  );

  if (!hasData) {
    return (
      <Card className="relative overflow-hidden">
        <div className="h-0.5 bg-gradient-knak" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-warning" />
            Skills to Look For
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-center text-muted-foreground py-4 text-sm">
            Complete team assessments to see hiring recommendations based on skill gaps.
          </p>
        </CardContent>
      </Card>
    );
  }

  const assessedMemberCount = members.filter(
    (m: any) => latestAssessmentByMember[m._id]
  ).length;

  // Group by priority
  const criticalGaps = competencyScores.filter((c) => c.priority === "high");
  const gaps = competencyScores.filter((c) => c.priority === "medium");
  const strengths = competencyScores.filter((c) => c.priority === "strength");
  const notAssessed = competencyScores.filter((c) => c.priority === "not_assessed");

  // Build summary text
  let summaryText: string;
  if (criticalGaps.length > 0) {
    const names = criticalGaps.map((c) => c.competencyTitle);
    summaryText = `Prioritize candidates strong in ${names.join(" and ")}. ${names.length === 1 ? "This is" : "These are"} your team's biggest gap${names.length === 1 ? "" : "s"}.`;
  } else if (gaps.length > 0) {
    summaryText =
      "No critical gaps, but look for candidates who can strengthen mid-range areas.";
  } else {
    summaryText =
      "Team is well-rounded. Hire for culture add or to deepen existing strengths.";
  }

  const renderCompetencyRow = (rec: CompetencyScore) => {
    const dots = getStrengthDots(rec.avgScore, rec.maxScore);
    const label = getStrengthLabel(rec.avgScore, rec.maxScore);
    const dotColor =
      rec.priority === "high"
        ? "bg-destructive"
        : rec.priority === "medium"
          ? "bg-warning"
          : "bg-success";
    const emptyDotColor =
      rec.priority === "high"
        ? "bg-destructive/20"
        : rec.priority === "medium"
          ? "bg-warning/20"
          : "bg-success/20";

    return (
      <div key={rec.competencyId} className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{rec.competencyTitle}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i < dots ? dotColor : emptyDotColor}`}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Sub-competencies for gaps */}
        {(rec.priority === "high" || rec.priority === "medium") &&
          rec.subScores.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-0.5">
              {rec.subScores.map((sub) => {
                const subLabel = getStrengthLabel(sub.avgScore, rec.maxScore);
                return (
                  <Badge
                    key={sub.subCompetencyId}
                    variant="outline"
                    className="text-xs font-normal gap-1"
                  >
                    {sub.title}
                    <span className="text-muted-foreground">{subLabel}</span>
                  </Badge>
                );
              })}
            </div>
          )}
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="h-0.5 bg-gradient-knak" />
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-warning" />
              Skills to Look For
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Based on {assessedMemberCount}/{members.length} assessed members
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-sm text-foreground">{summaryText}</p>
          </div>
        </CardContent>
      </button>

      {isExpanded && (
        <CardContent className="space-y-5 pt-0">
          {/* Critical Gaps */}
          {criticalGaps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                <h4 className="text-xs font-medium uppercase tracking-wide text-destructive">
                  Critical Gaps
                </h4>
                <Badge variant="destructive" className="text-xs ml-auto">
                  {criticalGaps.length}
                </Badge>
              </div>
              <div className="space-y-3 pl-5">
                {criticalGaps.map(renderCompetencyRow)}
              </div>
            </div>
          )}

          {/* Areas to Strengthen */}
          {gaps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Minus className="h-3.5 w-3.5 text-warning" />
                <h4 className="text-xs font-medium uppercase tracking-wide text-warning">
                  Areas to Strengthen
                </h4>
                <Badge className="text-xs ml-auto bg-warning text-warning-foreground hover:bg-warning/90">
                  {gaps.length}
                </Badge>
              </div>
              <div className="space-y-3 pl-5">
                {gaps.map(renderCompetencyRow)}
              </div>
            </div>
          )}

          {/* Not Assessed */}
          {notAssessed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Not Yet Assessed
                </h4>
                <Badge variant="outline" className="text-xs ml-auto border-dashed">
                  {notAssessed.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-5">
                {notAssessed.map((rec) => (
                  <Badge
                    key={rec.competencyId}
                    variant="outline"
                    className="text-xs font-normal border-dashed"
                  >
                    {rec.competencyTitle}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Team Strengths — collapsed by default */}
          {strengths.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStrengths(!showStrengths);
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Team Strengths
                </h4>
                <Badge className="text-xs ml-auto bg-success text-success-foreground hover:bg-success/90">
                  {strengths.length}
                </Badge>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showStrengths ? "rotate-180" : ""}`}
                />
              </button>
              {showStrengths && (
                <div className="space-y-3 pl-5">
                  {strengths.map(renderCompetencyRow)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
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

const EVALUATION_SCORES: Record<string, number> = {
  well_below: 1,
  below: 2,
  target: 3,
  above: 4,
  well_above: 5,
};

const MAX_SCORE = 5;

const getStrengthLabel = (avgScore: number, maxScore: number) => {
  const ratio = avgScore / maxScore;
  if (ratio < 0.3) return "Very weak";
  if (ratio < 0.45) return "Weak";
  if (ratio < 0.55) return "Below avg";
  if (ratio < 0.7) return "Average";
  if (ratio < 0.85) return "Above avg";
  return "Strong";
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
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold">Skills to Look For</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Add team members and complete assessments to see hiring recommendations.
        </p>
      </div>
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

  // Calculate scores per competency AND per sub-competency using 1-5 scale
  const competencyScores: CompetencyScore[] = competencies.map((comp: any) => {
    let compTotal = 0;
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

      let memberTotal = 0;
      let memberEvalCount = 0;

      memberProgress.forEach((progress: any) => {
        const evaluations = evaluationsByProgress.get(progress._id) || [];

        let subTotal = 0;
        let subEvalCount = 0;
        evaluations.forEach((evaluation: any) => {
          memberEvalCount++;
          subEvalCount++;
          subTotal += EVALUATION_SCORES[evaluation.evaluation] || 3;
        });
        memberTotal += subTotal;

        if (subEvalCount > 0) {
          const subId = progress.subCompetencyId;
          const existing = subScoreAccumulator.get(subId) || {
            total: 0,
            count: 0,
            evalCount: 0,
          };
          existing.total += subTotal / subEvalCount;
          existing.count += 1;
          existing.evalCount += subEvalCount;
          subScoreAccumulator.set(subId, existing);
        }
      });

      if (memberEvalCount > 0) {
        compTotal += memberTotal / memberEvalCount;
        memberCount++;
      }
    });

    const avgScore = memberCount > 0 ? compTotal / memberCount : 0;

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
    } else if (avgScore < 2.5) {
      priority = "high";
    } else if (avgScore < 3.5) {
      priority = "medium";
    } else {
      priority = "strength";
    }

    return {
      competencyId: comp._id,
      competencyTitle: comp.title,
      avgScore,
      maxScore: MAX_SCORE,
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold">Skills to Look For</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Complete team assessments to see hiring recommendations.
        </p>
      </div>
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

  const renderCompetencyItem = (rec: CompetencyScore) => {
    const label = getStrengthLabel(rec.avgScore, rec.maxScore);
    const labelColor =
      rec.priority === "high"
        ? "text-destructive"
        : rec.priority === "medium"
          ? "text-warning"
          : "text-success";

    return (
      <div key={rec.competencyId} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium truncate">{rec.competencyTitle}</span>
          <span className={`text-[10px] font-medium shrink-0 ${labelColor}`}>{label}</span>
        </div>
        {/* Sub-competency breakdown for gaps */}
        {(rec.priority === "high" || rec.priority === "medium") &&
          rec.subScores.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {rec.subScores.map((sub) => (
                <span
                  key={sub.subCompetencyId}
                  className="text-[10px] text-muted-foreground bg-muted/80 rounded px-1.5 py-0.5"
                >
                  {sub.title}
                </span>
              ))}
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold">Skills to Look For</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {assessedMemberCount}/{members.length} assessed
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground leading-relaxed">{summaryText}</p>

      {/* Critical Gaps */}
      {criticalGaps.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-destructive" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
              Critical Gaps
            </span>
          </div>
          <div className="space-y-3">
            {criticalGaps.map(renderCompetencyItem)}
          </div>
        </div>
      )}

      {/* Areas to Strengthen */}
      {gaps.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Minus className="h-3 w-3 text-warning" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
              Areas to Strengthen
            </span>
          </div>
          <div className="space-y-3">
            {gaps.map(renderCompetencyItem)}
          </div>
        </div>
      )}

      {/* Expandable: strengths & not-assessed */}
      {(notAssessed.length > 0 || strengths.length > 0) && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 w-full text-left pt-1 border-t border-border/50"
          >
            <span className="text-[10px] font-medium text-muted-foreground">
              {isExpanded ? "Hide" : "Show"} strengths & unassessed
            </span>
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {isExpanded && (
            <div className="space-y-4">
              {/* Not Assessed */}
              {notAssessed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Not Assessed
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {notAssessed.map((rec) => (
                      <span
                        key={rec.competencyId}
                        className="text-[10px] text-muted-foreground border border-dashed border-border rounded px-1.5 py-0.5"
                      >
                        {rec.competencyTitle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Strengths */}
              {strengths.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStrengths(!showStrengths);
                    }}
                    className="flex items-center gap-1.5 w-full text-left"
                  >
                    <ShieldCheck className="h-3 w-3 text-success" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Strengths
                    </span>
                    <Badge className="text-[10px] h-4 px-1.5 ml-auto bg-success text-success-foreground hover:bg-success/90">
                      {strengths.length}
                    </Badge>
                    <ChevronDown
                      className={`h-3 w-3 text-muted-foreground transition-transform ${showStrengths ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showStrengths && (
                    <div className="space-y-3">
                      {strengths.map(renderCompetencyItem)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

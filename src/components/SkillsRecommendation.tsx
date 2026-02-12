import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";

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

export const SkillsRecommendation = () => {
  const teamSkillData = useQuery(api.teamSkillData.getTeamSkillData);

  const loading = teamSkillData === undefined;

  if (loading) {
    return (
      <Card>
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
      <Card>
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
      return base + 4; // well_above modifier
    }),
    6
  );

  // Calculate scores per competency AND per sub-competency
  const competencyScores: CompetencyScore[] = competencies.map((comp: any) => {
    let totalScore = 0;
    let memberCount = 0;

    // Track sub-competency scores across all members
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

        // Track per sub-competency
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

    // Build sub-competency scores
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
      <Card>
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

  const getPriorityBadge = (
    priority: "not_assessed" | "high" | "medium" | "strength"
  ) => {
    switch (priority) {
      case "not_assessed":
        return (
          <Badge variant="outline" className="gap-1 border-dashed text-xs">
            <AlertTriangle className="h-3 w-3" />
            No Data
          </Badge>
        );
      case "high":
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <TrendingDown className="h-3 w-3" />
            Hire For
          </Badge>
        );
      case "medium":
        return (
          <Badge className="gap-1 text-xs bg-warning text-warning-foreground hover:bg-warning/90">
            <Minus className="h-3 w-3" />
            Gap
          </Badge>
        );
      case "strength":
        return (
          <Badge className="gap-1 text-xs bg-success text-success-foreground hover:bg-success/90">
            <TrendingUp className="h-3 w-3" />
            Strong
          </Badge>
        );
    }
  };

  const getBarColor = (priority: CompetencyScore["priority"]) => {
    switch (priority) {
      case "not_assessed":
        return "bg-muted-foreground/30";
      case "high":
        return "bg-destructive";
      case "medium":
        return "bg-warning";
      case "strength":
        return "bg-success";
    }
  };

  // Find weakest competencies that have sub-competency data (for detail drill-down)
  const weakestWithSubs = competencyScores.filter(
    (c) =>
      (c.priority === "high" || c.priority === "medium") &&
      c.subScores.length > 0
  );

  // Build summary text
  const highPriorityCount = competencyScores.filter(
    (c) => c.priority === "high"
  ).length;
  const gapCount = competencyScores.filter(
    (c) => c.priority === "medium"
  ).length;

  let summaryText: string;
  if (highPriorityCount > 0) {
    const weakestNames = competencyScores
      .filter((c) => c.priority === "high")
      .map((c) => c.competencyTitle);
    summaryText = `Prioritize candidates strong in ${weakestNames.join(" and ")}.`;
  } else if (gapCount > 0) {
    summaryText =
      "No critical gaps, but look for candidates who can strengthen mid-range areas.";
  } else {
    summaryText =
      "Team is well-rounded. Hire for culture add or to deepen existing strengths.";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-warning" />
            Skills to Look For
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {assessedMemberCount}/{members.length} assessed
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {competencyScores.map((rec) => (
          <div key={rec.competencyId} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate mr-2">
                {rec.competencyTitle}
              </span>
              {getPriorityBadge(rec.priority)}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(rec.priority)}`}
                  style={{
                    width:
                      rec.priority === "not_assessed"
                        ? "0%"
                        : `${(rec.avgScore / rec.maxScore) * 100}%`,
                  }}
                />
              </div>
              {rec.priority !== "not_assessed" && (
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {rec.avgScore.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Sub-competency detail for weakest areas */}
        {weakestWithSubs.length > 0 && (
          <div className="border-t pt-3 mt-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Weakest sub-skills to screen for
            </p>
            {weakestWithSubs.slice(0, 2).map((comp) => (
              <div key={comp.competencyId} className="space-y-1">
                <p className="text-xs font-medium">{comp.competencyTitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {comp.subScores.slice(0, 3).map((sub) => (
                    <Badge
                      key={sub.subCompetencyId}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {sub.title}
                      <span className="ml-1 text-muted-foreground">
                        {sub.avgScore.toFixed(1)}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-2 border-t">
          {summaryText}
        </p>
      </CardContent>
    </Card>
  );
};

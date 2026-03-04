import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CriteriaEvaluation {
  _id?: string;
  progressId: string;
  criterionText: string;
  evaluation: "well_below" | "below" | "target" | "above" | "well_above";
}

interface Progress {
  _id?: string;
  subCompetencyId: string;
  currentLevel: string;
  notes: string;
  evaluations?: CriteriaEvaluation[];
}

interface Competency {
  _id: string;
  title: string;
  code: string;
  orderIndex: number;
}

interface SubCompetency {
  _id: string;
  competencyId: string;
  title: string;
  code?: string;
  levelCriteria?: Record<string, string[]> | null;
  orderIndex: number;
}

export interface AssessmentTrendData {
  date: string;
  assessmentId: string;
  competencyScores: Record<string, number>;
}

export interface OverallAssessmentSummary {
  chartData: Array<{ competency: string; level: number; fullMark: number }>;
  competencyScores: Record<
    string,
    { aboveCount: number; targetCount: number; belowCount: number }
  >;
  overallAverage: string;
  trend: "level-up" | "needs-support" | "on-track";
  recommendation: string;
  hasData: boolean;
}

function evalToNumeric(evaluation: string): number {
  switch (evaluation) {
    case "well_above":
      return 5;
    case "above":
      return 4;
    case "target":
      return 3;
    case "below":
      return 2;
    case "well_below":
      return 1;
    default:
      return 3;
  }
}

export function useMemberAssessmentData(
  memberId: string,
  roleId?: string,
  memberName?: string
) {
  // Convex reactive queries
  const globalCompetencies = useQuery(
    api.competencies.list,
    roleId ? "skip" : {}
  );
  const globalSubCompetencies = useQuery(
    api.competencies.listSubCompetencies,
    roleId ? "skip" : {}
  );
  const roleCompetencies = useQuery(
    api.competencies.listByRole,
    roleId ? { roleId: roleId as any } : "skip"
  );
  const roleSubCompetencies = useQuery(
    api.competencies.listSubCompetenciesByRole,
    roleId ? { roleId: roleId as any } : "skip"
  );
  const competencies = (
    roleId ? roleCompetencies : globalCompetencies
  ) as Competency[] | undefined;
  const subCompetencies = (
    roleId ? roleSubCompetencies : globalSubCompetencies
  ) as SubCompetency[] | undefined;
  const assessments = useQuery(api.assessments.listForMember, { memberId });
  const progressData = useQuery(api.progress.listForMember, { memberId });

  const progressIds = useMemo(
    () => (progressData || []).map((p: any) => p._id),
    [progressData]
  );

  const evaluationsData = useQuery(
    api.evaluations.listForProgressIds,
    progressIds.length > 0 ? { progressIds: progressIds as any } : "skip"
  );

  const loading =
    competencies === undefined ||
    subCompetencies === undefined ||
    progressData === undefined;

  // Build progress map (latest assessment's progress)
  const progress = useMemo(() => {
    if (!progressData || !competencies || !subCompetencies) return {};

    const evalsByProgressId: Record<string, CriteriaEvaluation[]> = {};
    if (evaluationsData) {
      for (const e of evaluationsData as any[]) {
        if (!evalsByProgressId[e.progressId])
          evalsByProgressId[e.progressId] = [];
        evalsByProgressId[e.progressId].push(e as CriteriaEvaluation);
      }
    }

    const completedAssessments = (assessments || []).filter(
      (a: any) => a.status === "completed"
    );
    let relevantProgress = progressData as any[];

    if (completedAssessments.length > 0) {
      const sorted = [...completedAssessments].sort(
        (a: any, b: any) => (a.completedAt || 0) - (b.completedAt || 0)
      );
      const latestId = sorted[sorted.length - 1]._id;
      const linkedToLatest = relevantProgress.filter(
        (p: any) => p.assessmentId === latestId
      );
      if (linkedToLatest.length > 0) relevantProgress = linkedToLatest;
    }

    const progressMap: Record<string, Progress> = {};
    for (const p of relevantProgress) {
      progressMap[p.subCompetencyId] = {
        _id: p._id,
        subCompetencyId: p.subCompetencyId,
        currentLevel: p.currentLevel,
        notes: p.notes || "",
        evaluations: evalsByProgressId[p._id] || [],
      };
    }
    return progressMap;
  }, [progressData, evaluationsData, assessments, competencies, subCompetencies]);

  // Build trend data
  const trendData = useMemo(() => {
    if (!competencies || !subCompetencies || !progressData || !assessments)
      return [];
    const completedAssessments = (assessments as any[])
      .filter((a: any) => a.status === "completed")
      .sort((a: any, b: any) => (a.completedAt || 0) - (b.completedAt || 0));
    if (completedAssessments.length <= 1) return [];

    const evalsByProgressId: Record<string, CriteriaEvaluation[]> = {};
    if (evaluationsData) {
      for (const e of evaluationsData as any[]) {
        if (!evalsByProgressId[e.progressId])
          evalsByProgressId[e.progressId] = [];
        evalsByProgressId[e.progressId].push(e as CriteriaEvaluation);
      }
    }

    const allProgress = progressData as any[];
    const trendDataArray: AssessmentTrendData[] = [];

    for (const assessment of completedAssessments) {
      const assessmentProgress = allProgress.filter(
        (p: any) => p.assessmentId === assessment._id
      );
      if (assessmentProgress.length === 0) continue;
      const competencyScores: Record<string, number> = {};

      (competencies as Competency[]).forEach((comp) => {
        const compSubs = (subCompetencies as SubCompetency[]).filter(
          (s) => s.competencyId === comp._id
        );
        const compSubIds = compSubs.map((s) => s._id);
        const compProgress = assessmentProgress.filter((p: any) =>
          compSubIds.includes(p.subCompetencyId)
        );
        if (compProgress.length === 0) {
          competencyScores[comp._id] = 0;
          return;
        }
        const compProgressIds = compProgress.map((p: any) => p._id);
        const compEvals = Object.entries(evalsByProgressId)
          .filter(([pid]) => compProgressIds.includes(pid))
          .flatMap(([, evals]) => evals);
        if (compEvals.length === 0) {
          competencyScores[comp._id] = 0;
          return;
        }
        const totalScore = compEvals.reduce(
          (sum, e) => sum + evalToNumeric(e.evaluation),
          0
        );
        competencyScores[comp._id] = totalScore / compEvals.length;
      });

      trendDataArray.push({
        date: assessment.completedAt || "",
        assessmentId: assessment._id,
        competencyScores,
      });
    }
    return trendDataArray;
  }, [competencies, subCompetencies, progressData, assessments, evaluationsData]);

  // Sorted assessments
  const sortedAssessments = useMemo(() => {
    return [...(assessments || [])].sort(
      (a, b) => b._creationTime - a._creationTime
    );
  }, [assessments]);

  const completedAssessments = sortedAssessments.filter(
    (a: any) => a.status === "completed"
  );

  // Overall summary for radar chart
  const getOverallAssessmentSummary = (): OverallAssessmentSummary | null => {
    if (!competencies || !subCompetencies) return null;
    const competencyScores: Record<
      string,
      { aboveCount: number; targetCount: number; belowCount: number; title: string }
    > = {};

    Object.values(progress).forEach((p) => {
      const subComp = (subCompetencies as SubCompetency[]).find(
        (sc) => sc._id === p.subCompetencyId
      );
      if (!subComp) return;
      const comp = (competencies as Competency[]).find(
        (c) => c._id === subComp.competencyId
      );
      if (!comp) return;
      if (!competencyScores[comp._id])
        competencyScores[comp._id] = {
          aboveCount: 0,
          targetCount: 0,
          belowCount: 0,
          title: comp.title,
        };
      if (p.evaluations) {
        p.evaluations.forEach((evaluation) => {
          if (
            evaluation.evaluation === "above" ||
            evaluation.evaluation === "well_above"
          )
            competencyScores[comp._id].aboveCount++;
          else if (evaluation.evaluation === "target")
            competencyScores[comp._id].targetCount++;
          else if (
            evaluation.evaluation === "below" ||
            evaluation.evaluation === "well_below"
          )
            competencyScores[comp._id].belowCount++;
        });
      }
    });

    const hasData = Object.keys(competencyScores).length > 0;
    const chartData = (competencies as Competency[]).map((comp) => {
      const data = competencyScores[comp._id];
      if (!data) return { competency: comp.title, level: 0, fullMark: 5 };
      const total = data.aboveCount + data.targetCount + data.belowCount;
      if (total === 0)
        return { competency: data.title, level: 0, fullMark: 5 };
      return {
        competency: data.title,
        level:
          (data.aboveCount * 4.5 + data.targetCount * 3 + data.belowCount * 1.5) /
          total,
        fullMark: 5,
      };
    });

    const overallAverage =
      chartData.length > 0
        ? chartData.reduce((sum, item) => sum + item.level, 0) /
          chartData.length
        : 0;
    let overallTrend: "level-up" | "needs-support" | "on-track" = "on-track";
    let overallRecommendation = "";
    const name = memberName || "This member";
    if (!hasData) {
      overallRecommendation =
        "No assessment data available yet. Create an assessment to generate personalized recommendations.";
    } else if (overallAverage >= 4.0) {
      overallTrend = "level-up";
      overallRecommendation = `${name} demonstrates exceptional skills with most criteria above target. Ready for increased responsibilities and leadership opportunities.`;
    } else if (overallAverage < 2.5) {
      overallTrend = "needs-support";
      overallRecommendation = `Focus on developing foundational skills across competencies. Recommend targeted training and mentorship to address gaps.`;
    } else {
      overallTrend = "on-track";
      overallRecommendation = `${name} is progressing well with solid performance across competencies. Continue supporting growth in key areas.`;
    }

    // Strip title from competencyScores to match expected shape
    const scores: Record<
      string,
      { aboveCount: number; targetCount: number; belowCount: number }
    > = {};
    for (const [key, val] of Object.entries(competencyScores)) {
      scores[key] = {
        aboveCount: val.aboveCount,
        targetCount: val.targetCount,
        belowCount: val.belowCount,
      };
    }

    return {
      chartData,
      competencyScores: scores,
      overallAverage: overallAverage.toFixed(1),
      trend: overallTrend,
      recommendation: overallRecommendation,
      hasData,
    };
  };

  const getCompetencyTrend = (
    _compId: string,
    scores: { aboveCount: number; targetCount: number; belowCount: number }
  ) => {
    const total = scores.aboveCount + scores.targetCount + scores.belowCount;
    if (total === 0) return "not-assessed";
    if (scores.aboveCount / total > 0.5) return "excelling";
    if (scores.belowCount / total > 0.5) return "needs-support";
    return "on-track";
  };

  // Get evaluation distribution for a completed assessment
  const getAssessmentDistribution = (assessmentId: string) => {
    if (!progressData || !evaluationsData) return null;
    const assessmentProgressItems = (progressData as any[]).filter(
      (p: any) => p.assessmentId === assessmentId
    );
    const progressIdSet = new Set(
      assessmentProgressItems.map((p: any) => p._id)
    );

    let above = 0,
      target = 0,
      below = 0,
      total = 0;
    (evaluationsData as any[]).forEach((e: any) => {
      if (!progressIdSet.has(e.progressId)) return;
      total++;
      if (e.evaluation === "above" || e.evaluation === "well_above") above++;
      else if (e.evaluation === "target") target++;
      else if (e.evaluation === "below" || e.evaluation === "well_below")
        below++;
    });

    if (total === 0) return null;
    return {
      above: (above / total) * 100,
      target: (target / total) * 100,
      below: (below / total) * 100,
    };
  };

  return {
    competencies,
    subCompetencies,
    assessments,
    progressData,
    evaluationsData,
    progress,
    trendData,
    loading,
    sortedAssessments,
    completedAssessments,
    getOverallAssessmentSummary,
    getCompetencyTrend,
    getAssessmentDistribution,
  };
}

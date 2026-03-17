import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useRoleLevels } from "@/hooks/useRoleLevels";
import { useMemberAssessmentData } from "@/hooks/useMemberAssessmentData";
import { getLevelAbove, keyToLabel, getCriteriaForLevelWithFallback } from "@/lib/levelUtils";
import { ProgressViewSkeleton } from "@/components/skeletons/ProgressViewSkeleton";
import { OverviewTab } from "@/components/member-tabs/OverviewTab";

import { ProgressionPlanTab } from "@/components/member-tabs/ProgressionPlanTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardCheck, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { PromotionPlanData, TabCommonProps } from "@/components/member-tabs/types";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const TeamMemberDetailPage = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { roleId } = useRole();

  const member = useQuery(
    api.teamMembers.get,
    memberId ? { id: memberId as Id<"teamMembers"> } : "skip"
  );

  const assessments = useQuery(
    api.assessments.listForMember,
    memberId ? { memberId: memberId as Id<"teamMembers"> } : "skip"
  );

  if (member === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (member === null) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team member not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/roles/${roleId}/team`)}>
          Back to Team
        </Button>
      </div>
    );
  }

  const completedAssessments = (assessments || []).filter((a: any) => a.status === "completed");
  const lastAssessment = completedAssessments.length > 0
    ? [...completedAssessments].sort((a: any, b: any) => (b.completedAt || 0) - (a.completedAt || 0))[0]
    : null;

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-2xl font-semibold">{member.name}</h1>
            <Badge variant="outline" className="text-xs">
              {member.role}
            </Badge>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-primary/70" />
              {completedAssessments.length} {completedAssessments.length === 1 ? "Assessment" : "Assessments"}
            </span>
            {lastAssessment && (
              <>
                <div className="w-px h-3.5 bg-border" />
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Last assessed {formatDate((lastAssessment as any).completedAt)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tabbed content */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <MemberDetailContent member={member} isAdmin={isAdmin} roleId={roleId} />
        </div>
      </div>
    </div>
  );
};

function MemberDetailContent({
  member,
  isAdmin,
  roleId,
}: {
  member: { _id: string; name: string; role: string };
  isAdmin: boolean;
  roleId?: string;
}) {
  const { levels } = useRoleLevels(roleId);

  const {
    competencies,
    subCompetencies,
    progressData,
    progress,
    trendData,
    loading,
    sortedAssessments,
    completedAssessments,
    getOverallAssessmentSummary,
    getCompetencyTrend,
    getAssessmentDistribution,
  } = useMemberAssessmentData(member._id, roleId, member.name);

  const plan = useQuery(api.promotionPlans.getLatestForMember, {
    memberId: member._id,
  }) as PromotionPlanData | null | undefined;

  const currentLevelKey = member.role.toLowerCase().replace(/\s+/g, "_");
  const targetLevelKey = getLevelAbove(levels, currentLevelKey);

  const competencyGapData = useMemo(() => {
    if (!competencies || !subCompetencies) return [];
    return (competencies as any[]).map((comp: any) => {
      const subs = (subCompetencies as any[]).filter((s: any) => s.competencyId === comp._id);
      let aboveCount = 0, targetCount = 0, belowCount = 0, totalEvals = 0;
      const belowTargetSubs: Array<{ subTitle: string; criteria: Array<{ text: string; evaluation: string }> }> = [];

      subs.forEach((sub: any) => {
        const p = progress[sub._id];
        if (!p || !p.evaluations) return;
        const belowCriteria: Array<{ text: string; evaluation: string }> = [];
        p.evaluations.forEach((ev: any) => {
          totalEvals++;
          if (ev.evaluation === "above" || ev.evaluation === "well_above") aboveCount++;
          else if (ev.evaluation === "target") targetCount++;
          else {
            belowCount++;
            belowCriteria.push({ text: ev.criterionText, evaluation: ev.evaluation });
          }
        });
        if (belowCriteria.length > 0) {
          belowTargetSubs.push({ subTitle: sub.title, criteria: belowCriteria });
        }
      });

      const nextLevelCriteriaCount = targetLevelKey
        ? subs.reduce((count: number, sub: any) => count + getCriteriaForLevelWithFallback(sub, targetLevelKey).length, 0)
        : 0;

      const score = totalEvals > 0
        ? (aboveCount * 4.5 + targetCount * 3 + belowCount * 1.5) / totalEvals
        : 0;

      return {
        _id: comp._id,
        title: comp.title,
        score,
        aboveCount,
        targetCount,
        belowCount,
        totalEvals,
        belowTargetSubs,
        nextLevelCriteriaCount,
        assessedCount: subs.filter((s: any) => progress[s._id]).length,
        totalSubs: subs.length,
      };
    });
  }, [competencies, subCompetencies, progress, targetLevelKey]);

  const overallStats = useMemo(() => {
    if (competencyGapData.length === 0)
      return { score: 0, above: 0, target: 0, below: 0, total: 0 };
    const totals = competencyGapData.reduce(
      (acc, c) => ({
        above: acc.above + c.aboveCount,
        target: acc.target + c.targetCount,
        below: acc.below + c.belowCount,
        total: acc.total + c.totalEvals,
      }),
      { above: 0, target: 0, below: 0, total: 0 }
    );
    const score = totals.total > 0
      ? (totals.above * 4.5 + totals.target * 3 + totals.below * 1.5) / totals.total
      : 0;
    return { score, ...totals };
  }, [competencyGapData]);

  const readinessPercent = useMemo(() => {
    if (overallStats.total === 0) return 0;
    return Math.round(((overallStats.above + overallStats.target) / overallStats.total) * 100);
  }, [overallStats]);

  const overallTrendLabel = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    const compIds = Object.keys(first.competencyScores);
    if (compIds.length === 0) return null;
    let firstTotal = 0, lastTotal = 0, count = 0;
    compIds.forEach((id) => {
      const f = first.competencyScores[id] || 0;
      const l = last.competencyScores[id] || 0;
      if (f > 0 || l > 0) { firstTotal += f; lastTotal += l; count++; }
    });
    if (count === 0) return null;
    const diff = lastTotal / count - firstTotal / count;
    if (diff > 0.3) return "Improving";
    if (diff < -0.3) return "Declining";
    return "Stable";
  }, [trendData]);

  const assessmentDateRange = useMemo(() => {
    if (completedAssessments.length === 0) return null;
    const sorted = [...completedAssessments].sort(
      (a: any, b: any) => (a.completedAt || 0) - (b.completedAt || 0)
    );
    const first = (sorted[0] as any).completedAt;
    const last = (sorted[sorted.length - 1] as any).completedAt;
    if (!first || !last) return null;
    return {
      from: format(new Date(first), "MMM yyyy"),
      to: format(new Date(last), "MMM yyyy"),
    };
  }, [completedAssessments]);

  const isPlanStale = useMemo(() => {
    if (!plan || completedAssessments.length === 0) return false;
    const latestAssessment = [...completedAssessments].sort(
      (a: any, b: any) => (b.completedAt || 0) - (a.completedAt || 0)
    )[0] as any;
    if (!latestAssessment?.completedAt) return false;
    return new Date(latestAssessment.completedAt) > new Date(plan.generatedAt);
  }, [plan, completedAssessments]);

  if (loading || plan === undefined) {
    return <ProgressViewSkeleton />;
  }

  const overallSummary = getOverallAssessmentSummary();
  const planContent = plan?.planContent ?? null;

  const commonProps: TabCommonProps = {
    member,
    isAdmin,
    roleId,
    levels,
    competencies: competencies as any[],
    subCompetencies: subCompetencies as any[],
    sortedAssessments,
    completedAssessments,
    progress,
    progressData: progressData as any[],
    trendData,
    competencyGapData,
    overallStats,
    overallSummary,
    currentLevelKey,
    targetLevelKey,
    plan,
    planContent,
    readinessPercent,
    overallTrendLabel,
    assessmentDateRange,
    isPlanStale,
    getCompetencyTrend,
    getAssessmentDistribution,
  };

  return (
    <Tabs className="flex flex-col justify-center" defaultValue="overview">
      <TabsList className="mb-6 mx-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="plan">Progression Plan</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab {...commonProps} />
      </TabsContent>
<TabsContent value="plan">
        <ProgressionPlanTab {...commonProps} />
      </TabsContent>
    </Tabs>
  );
}

export default TeamMemberDetailPage;

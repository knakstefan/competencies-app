import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { ProgressViewSkeleton } from "./skeletons/ProgressViewSkeleton";
import { AssessmentWizard } from "./AssessmentWizard";
import { AssessmentDetailsDialog } from "./AssessmentDetailsDialog";
import { CompetencyTrendChart } from "./CompetencyTrendChart";
import {
  Eye,
  Plus,
  ClipboardCheck,
  PlayCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRoleLevels } from "@/hooks/useRoleLevels";

interface AssessmentTrendData {
  date: string;
  assessmentId: string;
  competencyScores: Record<string, number>;
}

interface TeamMember {
  _id: string;
  name: string;
  role: string;
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

interface CriteriaEvaluation {
  _id?: string;
  progressId: string;
  criterionText: string;
  evaluation: 'well_below' | 'below' | 'target' | 'above' | 'well_above';
}

interface Progress {
  _id?: string;
  subCompetencyId: string;
  currentLevel: string;
  notes: string;
  evaluations?: CriteriaEvaluation[];
}

interface MemberProgressViewProps {
  member: TeamMember;
  isAdmin: boolean;
  onDataChange?: () => void;
  roleId?: string;
}

export const MemberProgressView = ({ member, isAdmin, onDataChange, roleId }: MemberProgressViewProps) => {
  const { levels } = useRoleLevels(roleId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [showAllAssessments, setShowAllAssessments] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const removeAssessment = useMutation(api.assessments.remove);

  // Convex reactive queries
  const globalCompetencies = useQuery(api.competencies.list, roleId ? "skip" : {});
  const globalSubCompetencies = useQuery(api.competencies.listSubCompetencies, roleId ? "skip" : {});
  const roleCompetencies = useQuery(api.competencies.listByRole, roleId ? { roleId: roleId as any } : "skip");
  const roleSubCompetencies = useQuery(api.competencies.listSubCompetenciesByRole, roleId ? { roleId: roleId as any } : "skip");
  const competencies = (roleId ? roleCompetencies : globalCompetencies) as Competency[] | undefined;
  const subCompetencies = (roleId ? roleSubCompetencies : globalSubCompetencies) as SubCompetency[] | undefined;
  const assessments = useQuery(api.assessments.listForMember, { memberId: member._id });
  const progressData = useQuery(api.progress.listForMember, { memberId: member._id });

  const progressIds = useMemo(
    () => (progressData || []).map((p: any) => p._id),
    [progressData]
  );

  const evaluationsData = useQuery(
    api.evaluations.listForProgressIds,
    progressIds.length > 0 ? { progressIds: progressIds as any } : "skip"
  );

  const loading = competencies === undefined || subCompetencies === undefined || progressData === undefined;

  // Build progress map
  const progress = useMemo(() => {
    if (!progressData || !competencies || !subCompetencies) return {};

    const evalsByProgressId: Record<string, CriteriaEvaluation[]> = {};
    if (evaluationsData) {
      for (const e of evaluationsData as any[]) {
        if (!evalsByProgressId[e.progressId]) evalsByProgressId[e.progressId] = [];
        evalsByProgressId[e.progressId].push(e as CriteriaEvaluation);
      }
    }

    const completedAssessments = (assessments || []).filter((a: any) => a.status === "completed");
    let relevantProgress = progressData as any[];

    if (completedAssessments.length > 0) {
      const sorted = [...completedAssessments].sort((a: any, b: any) => (a.completedAt || 0) - (b.completedAt || 0));
      const latestId = sorted[sorted.length - 1]._id;
      const linkedToLatest = relevantProgress.filter((p: any) => p.assessmentId === latestId);
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
    if (!competencies || !subCompetencies || !progressData || !assessments) return [];
    const completedAssessments = (assessments as any[])
      .filter((a: any) => a.status === "completed")
      .sort((a: any, b: any) => (a.completedAt || 0) - (b.completedAt || 0));
    if (completedAssessments.length <= 1) return [];

    const evalsByProgressId: Record<string, CriteriaEvaluation[]> = {};
    if (evaluationsData) {
      for (const e of evaluationsData as any[]) {
        if (!evalsByProgressId[e.progressId]) evalsByProgressId[e.progressId] = [];
        evalsByProgressId[e.progressId].push(e as CriteriaEvaluation);
      }
    }

    const allProgress = progressData as any[];
    const trendDataArray: AssessmentTrendData[] = [];

    for (const assessment of completedAssessments) {
      const assessmentProgress = allProgress.filter((p: any) => p.assessmentId === assessment._id);
      if (assessmentProgress.length === 0) continue;
      const competencyScores: Record<string, number> = {};

      (competencies as Competency[]).forEach((comp) => {
        const compSubs = (subCompetencies as SubCompetency[]).filter((s) => s.competencyId === comp._id);
        const compSubIds = compSubs.map((s) => s._id);
        const compProgress = assessmentProgress.filter((p: any) => compSubIds.includes(p.subCompetencyId));
        if (compProgress.length === 0) { competencyScores[comp._id] = 0; return; }
        const compProgressIds = compProgress.map((p: any) => p._id);
        const compEvals = Object.entries(evalsByProgressId)
          .filter(([pid]) => compProgressIds.includes(pid))
          .flatMap(([, evals]) => evals);
        if (compEvals.length === 0) { competencyScores[comp._id] = 0; return; }
        const totalScore = compEvals.reduce((sum, e) => {
          switch (e.evaluation) {
            case "well_above": return sum + 5;
            case "above": return sum + 4;
            case "target": return sum + 3;
            case "below": return sum + 2;
            case "well_below": return sum + 1;
            default: return sum + 3;
          }
        }, 0);
        competencyScores[comp._id] = totalScore / compEvals.length;
      });

      trendDataArray.push({ date: assessment.completedAt || "", assessmentId: assessment._id, competencyScores });
    }
    return trendDataArray;
  }, [competencies, subCompetencies, progressData, assessments, evaluationsData]);

  // Assessment helpers
  const sortedAssessments = useMemo(() => {
    return [...(assessments || [])].sort((a, b) => b._creationTime - a._creationTime);
  }, [assessments]);

  const draftAssessment = sortedAssessments.find((a: any) => a.status === "draft");
  const completedAssessments = sortedAssessments.filter((a: any) => a.status === "completed");

  // Count how many sub-competencies have progress for a draft
  const draftProgressCount = useMemo(() => {
    if (!draftAssessment || !progressData) return 0;
    return (progressData as any[]).filter((p: any) => p.assessmentId === draftAssessment._id).length;
  }, [draftAssessment, progressData]);

  const totalSubCompetencies = subCompetencies?.length || 0;

  // Get evaluation distribution for a completed assessment
  const getAssessmentDistribution = (assessmentId: string) => {
    if (!progressData || !evaluationsData) return null;
    const assessmentProgressItems = (progressData as any[]).filter((p: any) => p.assessmentId === assessmentId);
    const progressIdSet = new Set(assessmentProgressItems.map((p: any) => p._id));

    let above = 0, target = 0, below = 0, total = 0;
    (evaluationsData as any[]).forEach((e: any) => {
      if (!progressIdSet.has(e.progressId)) return;
      total++;
      if (e.evaluation === "above" || e.evaluation === "well_above") above++;
      else if (e.evaluation === "target") target++;
      else if (e.evaluation === "below" || e.evaluation === "well_below") below++;
    });

    if (total === 0) return null;
    return {
      above: (above / total) * 100,
      target: (target / total) * 100,
      below: (below / total) * 100,
    };
  };

  const handleDeleteClick = (assessmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssessmentToDelete(assessmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assessmentToDelete) return;
    try {
      await removeAssessment({ id: assessmentToDelete as Id<"assessments"> });
      toast({ title: "Success", description: "Assessment deleted successfully" });
      onDataChange?.();
    } catch {
      toast({ title: "Error", description: "Failed to delete assessment", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const openDetailsDialog = (comp: Competency) => {
    setSelectedCompetency(comp);
    setDetailsDialogOpen(true);
  };

  // Overall summary for radar chart
  const getOverallAssessmentSummary = () => {
    if (!competencies || !subCompetencies) return null;
    const competencyScores: Record<string, { aboveCount: number; targetCount: number; belowCount: number; title: string }> = {};

    Object.values(progress).forEach((p) => {
      const subComp = (subCompetencies as SubCompetency[]).find((sc) => sc._id === p.subCompetencyId);
      if (!subComp) return;
      const comp = (competencies as Competency[]).find((c) => c._id === subComp.competencyId);
      if (!comp) return;
      if (!competencyScores[comp._id]) competencyScores[comp._id] = { aboveCount: 0, targetCount: 0, belowCount: 0, title: comp.title };
      if (p.evaluations) {
        p.evaluations.forEach((evaluation) => {
          if (evaluation.evaluation === "above" || evaluation.evaluation === "well_above") competencyScores[comp._id].aboveCount++;
          else if (evaluation.evaluation === "target") competencyScores[comp._id].targetCount++;
          else if (evaluation.evaluation === "below" || evaluation.evaluation === "well_below") competencyScores[comp._id].belowCount++;
        });
      }
    });

    const hasData = Object.keys(competencyScores).length > 0;
    const chartData = (competencies as Competency[]).map((comp) => {
      const data = competencyScores[comp._id];
      if (!data) return { competency: comp.title, level: 0, fullMark: 5 };
      const total = data.aboveCount + data.targetCount + data.belowCount;
      if (total === 0) return { competency: data.title, level: 0, fullMark: 5 };
      return { competency: data.title, level: (data.aboveCount * 4.5 + data.targetCount * 3 + data.belowCount * 1.5) / total, fullMark: 5 };
    });

    const overallAverage = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.level, 0) / chartData.length : 0;
    let overallTrend: "level-up" | "needs-support" | "on-track" = "on-track";
    let overallRecommendation = "";
    if (!hasData) {
      overallRecommendation = "No assessment data available yet. Create an assessment to generate personalized recommendations.";
    } else if (overallAverage >= 4.0) {
      overallTrend = "level-up";
      overallRecommendation = `${member.name} demonstrates exceptional skills with most criteria above target. Ready for increased responsibilities and leadership opportunities.`;
    } else if (overallAverage < 2.5) {
      overallTrend = "needs-support";
      overallRecommendation = `Focus on developing foundational skills across competencies. Recommend targeted training and mentorship to address gaps.`;
    } else {
      overallTrend = "on-track";
      overallRecommendation = `${member.name} is progressing well with solid performance across competencies. Continue supporting growth in key areas.`;
    }

    return { chartData, competencyScores, overallAverage: overallAverage.toFixed(1), trend: overallTrend, recommendation: overallRecommendation, hasData };
  };

  const getCompetencyTrend = (_compId: string, scores: { aboveCount: number; targetCount: number; belowCount: number }) => {
    const total = scores.aboveCount + scores.targetCount + scores.belowCount;
    if (total === 0) return "not-assessed";
    if (scores.aboveCount / total > 0.5) return "excelling";
    if (scores.belowCount / total > 0.5) return "needs-support";
    return "on-track";
  };

  if (loading) return <ProgressViewSkeleton />;

  const overallSummary = getOverallAssessmentSummary();
  const hasAnyAssessments = sortedAssessments.length > 0;
  const visibleCompleted = showAllAssessments ? completedAssessments : completedAssessments.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Section 1: Assessment Action Zone */}
      <div className="space-y-4">
        {/* Draft banner or Start CTA */}
        {draftAssessment ? (
          <Card
            className="relative overflow-hidden cursor-pointer ring-1 ring-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5"
            onClick={() => {
              setEditingAssessmentId(draftAssessment._id);
              setWizardOpen(true);
            }}
          >
            <div className="h-0.5 bg-gradient-knak" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PlayCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Continue Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                      Draft started {format(new Date(draftAssessment._creationTime), "MMM d, yyyy")}
                      {totalSubCompetencies > 0 && (
                        <span> &middot; {draftProgressCount} of {totalSubCompetencies} sub-competencies evaluated</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Draft</Badge>
                  <Button size="sm" className="gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Continue
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDeleteClick(draftAssessment._id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isAdmin ? (
          <button
            onClick={() => {
              setEditingAssessmentId(null);
              setWizardOpen(true);
            }}
            className="w-full group flex items-center gap-4 rounded-xl border-2 border-dashed border-primary/40 p-6 text-left transition-all duration-300 hover:border-primary/60 hover:bg-primary/[0.02]"
          >
            <div className="w-10 h-10 rounded-xl border border-dashed border-current flex items-center justify-center text-primary/60 transition-colors group-hover:border-primary/40 group-hover:text-primary">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base text-foreground">Start New Assessment</span>
              <p className="text-sm text-muted-foreground">
                Evaluate competencies against level-specific criteria. ~15 min. Progress saves automatically.
              </p>
            </div>
          </button>
        ) : null}

        {/* Completed assessment cards */}
        {visibleCompleted.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Assessment History</p>
            {visibleCompleted.map((assessment: any, index: number) => {
              const dist = getAssessmentDistribution(assessment._id);
              return (
                <div
                  key={assessment._id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <Card
                    className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                    onClick={() => {
                      setEditingAssessmentId(assessment._id);
                      setWizardOpen(true);
                    }}
                  >
                    <div className="h-0.5 bg-gradient-knak" />
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-sm">
                            {format(new Date(assessment.completedAt || assessment._creationTime), "MMMM yyyy")} Assessment
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Completed {format(new Date(assessment.completedAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {assessment.overallScore != null && (
                            <Badge variant="outline" className="text-xs">
                              {assessment.overallScore.toFixed(1)} / 5.0
                            </Badge>
                          )}
                          <Badge variant="default" className="text-xs">Completed</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteClick(assessment._id, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Mini stacked bar */}
                      {dist && (
                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                          {dist.above > 0 && (
                            <div className="h-full bg-green-500" style={{ width: `${dist.above}%` }} />
                          )}
                          {dist.target > 0 && (
                            <div className="h-full bg-primary" style={{ width: `${dist.target}%` }} />
                          )}
                          {dist.below > 0 && (
                            <div className="h-full bg-orange-500" style={{ width: `${dist.below}%` }} />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            {completedAssessments.length > 3 && !showAllAssessments && (
              <button
                onClick={() => setShowAllAssessments(true)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Show all {completedAssessments.length} assessments
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasAnyAssessments && !isAdmin && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No assessments yet.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Ask your administrator to create an assessment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section 2: Two-column layout — Competency Breakdown + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Competency Breakdown (wider) */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-lg font-semibold">Competency Breakdown</h3>
          <div className="space-y-3">
            {(competencies as Competency[]).map((comp, index) => {
              const subs = (subCompetencies as SubCompetency[]).filter((s) => s.competencyId === comp._id);
              const assessedSubs = subs.filter((sub) => progress[sub._id]);
              const assessedCount = assessedSubs.length;

              let aboveCount = 0, targetCount = 0, belowCount = 0, totalEvaluations = 0;
              assessedSubs.forEach((sub) => {
                const evals = progress[sub._id].evaluations || [];
                evals.forEach((e) => {
                  totalEvaluations++;
                  if (e.evaluation === "above" || e.evaluation === "well_above") aboveCount++;
                  else if (e.evaluation === "target") targetCount++;
                  else if (e.evaluation === "below" || e.evaluation === "well_below") belowCount++;
                });
              });

              const hasEvaluations = totalEvaluations > 0;
              const abovePercent = hasEvaluations ? (aboveCount / totalEvaluations) * 100 : 0;
              const targetPercent = hasEvaluations ? (targetCount / totalEvaluations) * 100 : 0;
              const belowPercent = hasEvaluations ? (belowCount / totalEvaluations) * 100 : 0;

              const compScores = overallSummary?.competencyScores?.[comp._id];
              const trend = compScores ? getCompetencyTrend(comp._id, compScores) : "not-assessed";

              return (
                <div key={comp._id} className="animate-fade-up" style={{ animationDelay: `${200 + index * 60}ms` }}>
                  <Card
                    className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
                    onClick={() => openDetailsDialog(comp)}
                  >
                    <div className="h-0.5 bg-gradient-knak" />
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{comp.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {assessedCount}/{subs.length} assessed
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          {trend === "excelling" && <Badge variant="default" className="bg-green-600 text-xs">Excelling</Badge>}
                          {trend === "needs-support" && <Badge variant="destructive" className="text-xs">Needs support</Badge>}
                          {trend === "on-track" && <Badge variant="secondary" className="text-xs">On track</Badge>}
                          {trend === "not-assessed" && <span className="text-xs text-muted-foreground/60">Not assessed</span>}
                        </div>
                      </div>
                      {hasEvaluations && (
                        <div className="space-y-1">
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            {abovePercent > 0 && <div className="h-full bg-green-500" style={{ width: `${abovePercent}%` }} />}
                            {targetPercent > 0 && <div className="h-full bg-primary" style={{ width: `${targetPercent}%` }} />}
                            {belowPercent > 0 && <div className="h-full bg-orange-500" style={{ width: `${belowPercent}%` }} />}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{Math.round(abovePercent)}%</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />{Math.round(targetPercent)}%</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{Math.round(belowPercent)}%</span>
                            </div>
                            <Eye className="w-3 h-3 text-muted-foreground/40" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Charts (narrower) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Radar chart */}
          <Card className={`relative overflow-hidden ${!overallSummary?.hasData ? 'opacity-40' : ''}`}>
            <div className="h-0.5 bg-gradient-knak" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Skill Overview</CardTitle>
                {overallSummary?.hasData && (
                  <div className="flex items-center gap-2">
                    {overallSummary.trend === "level-up" && <Badge variant="default" className="bg-green-600 text-xs">Advanced</Badge>}
                    {overallSummary.trend === "needs-support" && <Badge variant="destructive" className="text-xs">Developing</Badge>}
                    {overallSummary.trend === "on-track" && <Badge variant="secondary" className="text-xs">Progressing</Badge>}
                  </div>
                )}
              </div>
              {overallSummary?.hasData && (
                <p className="text-xs text-muted-foreground">{overallSummary.overallAverage} / 5.0</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={overallSummary?.chartData || []}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="competency" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                    <Radar name="Skill Level" dataKey="level" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                      formatter={(value: number) => [value.toFixed(1), "Level"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {overallSummary?.hasData && (
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 mt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">{overallSummary.recommendation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trend chart */}
          {trendData.length >= 2 && (
            <Card className="relative overflow-hidden">
              <div className="h-0.5 bg-gradient-knak" />
              <div className="p-4">
                <CompetencyTrendChart trendData={trendData} competencies={competencies as any} />
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AssessmentWizard
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditingAssessmentId(null); }}
        memberId={member._id}
        memberRole={member.role}
        competencies={competencies as any}
        subCompetencies={subCompetencies as any}
        existingAssessmentId={editingAssessmentId}
        levels={levels}
        roleId={roleId}
      />

      {selectedCompetency && (
        <AssessmentDetailsDialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          competency={selectedCompetency}
          subCompetencies={(subCompetencies as SubCompetency[]).filter((sc) => sc.competencyId === selectedCompetency._id)}
          progress={progress}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assessment? This will also delete all associated progress data and criteria evaluations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

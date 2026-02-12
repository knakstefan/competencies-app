import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { ProgressViewSkeleton } from "./skeletons/ProgressViewSkeleton";
import { AssessmentList } from "./AssessmentList";
import { AssessmentWizard } from "./AssessmentWizard";
import { AssessmentDetailsDialog } from "./AssessmentDetailsDialog";
import { CompetencyTrendChart } from "./CompetencyTrendChart";
import { Eye } from "lucide-react";

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
  associateLevel: string[] | null;
  intermediateLevel: string[] | null;
  seniorLevel: string[] | null;
  leadLevel: string[] | null;
  principalLevel: string[] | null;
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
}

const LEVELS = [
  { value: "associate", label: "Associate" },
  { value: "intermediate", label: "Intermediate" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "principal", label: "Principal" },
];

export const MemberProgressView = ({ member, isAdmin, onDataChange }: MemberProgressViewProps) => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const { toast } = useToast();

  // Convex reactive queries
  const competencies = useQuery(api.competencies.list) as Competency[] | undefined;
  const subCompetencies = useQuery(api.competencies.listSubCompetencies) as SubCompetency[] | undefined;
  const assessments = useQuery(api.assessments.listForMember, { memberId: member._id });
  const progressData = useQuery(api.progress.listForMember, { memberId: member._id });

  // Derive progress IDs for evaluations query
  const progressIds = useMemo(
    () => (progressData || []).map((p: any) => p._id),
    [progressData]
  );

  const evaluationsData = useQuery(
    api.evaluations.listForProgressIds,
    progressIds.length > 0 ? { progressIds: progressIds as any } : "skip"
  );

  // Determine loading state
  const loading = competencies === undefined || subCompetencies === undefined || progressData === undefined;

  // Build progress map with evaluations keyed by subCompetencyId
  const progress = useMemo(() => {
    if (!progressData || !competencies || !subCompetencies) return {};

    const evalsByProgressId: Record<string, CriteriaEvaluation[]> = {};
    if (evaluationsData) {
      for (const e of evaluationsData as any[]) {
        if (!evalsByProgressId[e.progressId]) {
          evalsByProgressId[e.progressId] = [];
        }
        evalsByProgressId[e.progressId].push(e as CriteriaEvaluation);
      }
    }

    // Filter to completed assessments
    const completedAssessments = (assessments || []).filter((a: any) => a.status === "completed");

    let relevantProgress = progressData as any[];

    // Use the latest completed assessment for the current view
    if (completedAssessments.length > 0) {
      // Sort by completedAt ascending
      const sorted = [...completedAssessments].sort(
        (a: any, b: any) => (a.completedAt || 0) - (b.completedAt || 0)
      );
      const latestId = sorted[sorted.length - 1]._id;
      const linkedToLatest = relevantProgress.filter((p: any) => p.assessmentId === latestId);
      if (linkedToLatest.length > 0) {
        relevantProgress = linkedToLatest;
      }
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

  // Build trend data from completed assessments
  const trendData = useMemo(() => {
    if (!competencies || !subCompetencies || !progressData || !assessments) return [];

    const completedAssessments = (assessments as any[])
      .filter((a: any) => a.status === "completed")
      .sort((a: any, b: any) => (a.completedAt || 0) - (b.completedAt || 0));

    if (completedAssessments.length <= 1) return [];

    const evalsByProgressId: Record<string, CriteriaEvaluation[]> = {};
    if (evaluationsData) {
      for (const e of evaluationsData as any[]) {
        if (!evalsByProgressId[e.progressId]) {
          evalsByProgressId[e.progressId] = [];
        }
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

      trendDataArray.push({
        date: assessment.completedAt || "",
        assessmentId: assessment._id,
        competencyScores,
      });
    }

    return trendDataArray;
  }, [competencies, subCompetencies, progressData, assessments, evaluationsData]);

  const openDetailsDialog = (comp: Competency) => {
    setSelectedCompetency(comp);
    setDetailsDialogOpen(true);
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "associate":
        return "secondary";
      case "intermediate":
        return "default";
      case "senior":
        return "default";
      case "lead":
        return "default";
      case "principal":
        return "default";
      default:
        return "secondary";
    }
  };

  const getAssessmentSummary = (evaluations: CriteriaEvaluation[] = []) => {
    const below = evaluations.filter((e) => e.evaluation === "below" || e.evaluation === "well_below");
    const target = evaluations.filter((e) => e.evaluation === "target");
    const above = evaluations.filter((e) => e.evaluation === "above" || e.evaluation === "well_above");
    const total = evaluations.length;

    if (total === 0) return null;

    const abovePercent = above.length / total;
    const belowPercent = below.length / total;

    let trend: "level-up" | "needs-support" | "on-track" = "on-track";
    let recommendation = "";

    if (abovePercent > 0.5) {
      trend = "level-up";
      const strengths = above.map((e) => e.criterionText.toLowerCase()).slice(0, 2);
      recommendation = `Excelling in areas like ${strengths.join(" and ")}. Ready to take on more complex projects and mentor others in these competencies. Consider stretch assignments that leverage these strengths.`;
    } else if (belowPercent > 0.5) {
      trend = "needs-support";
      const gaps = below.map((e) => e.criterionText.toLowerCase()).slice(0, 2);
      recommendation = `Requires focused development in ${gaps.join(" and ")}. Recommend pairing with experienced team members, structured learning opportunities, and setting specific measurable goals with regular feedback sessions.`;
    } else {
      if (above.length > 0) {
        const strengths = above.map((e) => e.criterionText.toLowerCase()).slice(0, 2);
        recommendation = `Performing well overall with notable strengths in ${strengths.join(" and ")}. Continue building on these areas while maintaining solid performance across other competencies.`;
      } else {
        recommendation =
          "Meeting expectations across all assessed criteria. Continue current trajectory and identify areas for future growth.";
      }
    }

    return {
      below: below.map((e) => e.criterionText),
      target: target.map((e) => e.criterionText),
      above: above.map((e) => e.criterionText),
      total,
      trend,
      recommendation,
    };
  };

  const getOverallAssessmentSummary = () => {
    if (!competencies || !subCompetencies) return null;

    const competencyScores: Record<
      string,
      {
        aboveCount: number;
        targetCount: number;
        belowCount: number;
        title: string;
      }
    > = {};

    // Aggregate evaluations by competency
    Object.values(progress).forEach((p) => {
      const subComp = (subCompetencies as SubCompetency[]).find((sc) => sc._id === p.subCompetencyId);
      if (!subComp) return;

      const comp = (competencies as Competency[]).find((c) => c._id === subComp.competencyId);
      if (!comp) return;

      if (!competencyScores[comp._id]) {
        competencyScores[comp._id] = {
          aboveCount: 0,
          targetCount: 0,
          belowCount: 0,
          title: comp.title,
        };
      }

      // Count evaluations (group into 3 categories for display)
      if (p.evaluations) {
        p.evaluations.forEach((evaluation) => {
          if (evaluation.evaluation === "above" || evaluation.evaluation === "well_above") {
            competencyScores[comp._id].aboveCount++;
          } else if (evaluation.evaluation === "target") {
            competencyScores[comp._id].targetCount++;
          } else if (evaluation.evaluation === "below" || evaluation.evaluation === "well_below") {
            competencyScores[comp._id].belowCount++;
          }
        });
      }
    });

    const hasData = Object.keys(competencyScores).length > 0;

    // Create radar chart data with skill scoring - maintain competency order
    const chartData = (competencies as Competency[]).map((comp) => {
      const data = competencyScores[comp._id];

      if (!data) {
        return {
          competency: comp.title,
          level: 0,
          fullMark: 5,
        };
      }

      const totalEvaluations = data.aboveCount + data.targetCount + data.belowCount;

      if (totalEvaluations === 0) {
        return {
          competency: data.title,
          level: 0,
          fullMark: 5,
        };
      }

      const skillLevel = (data.aboveCount * 4.5 + data.targetCount * 3 + data.belowCount * 1.5) / totalEvaluations;

      return {
        competency: data.title,
        level: skillLevel,
        fullMark: 5,
      };
    });

    // Calculate overall average level
    const overallAverage =
      chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.level, 0) / chartData.length : 0;

    // Determine trend based on average level
    let overallTrend: "level-up" | "needs-support" | "on-track" = "on-track";
    let overallRecommendation = "";

    if (!hasData) {
      overallRecommendation =
        "No assessment data available yet. Create an assessment to generate personalized recommendations.";
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

    return {
      chartData,
      overallAverage: overallAverage.toFixed(1),
      trend: overallTrend,
      recommendation: overallRecommendation,
      hasData,
    };
  };

  if (loading) {
    return <ProgressViewSkeleton />;
  }

  const overallSummary = getOverallAssessmentSummary();

  return (
    <div className="space-y-6">
      <AssessmentList
        memberId={member._id}
        onCreateAssessment={() => {
          setEditingAssessmentId(null);
          setWizardOpen(true);
        }}
        onEditAssessment={(id) => {
          setEditingAssessmentId(id);
          setWizardOpen(true);
        }}
        onAssessmentDeleted={() => {
          onDataChange?.();
        }}
      />

      {/* Skill Mapping and Assessment History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {/* Competency Cards */}
          <div className="space-y-4 mt-6">
            <h3 className="text-2xl font-semibold">Assessment Overview</h3>
            {(competencies as Competency[]).map((comp) => {
              const subs = (subCompetencies as SubCompetency[]).filter((s) => s.competencyId === comp._id);
              const assessedSubs = subs.filter((sub) => progress[sub._id]);
              const assessedCount = assessedSubs.length;

              // Calculate level distribution
              const levelCounts: Record<string, number> = {};
              assessedSubs.forEach((sub) => {
                const level = progress[sub._id].currentLevel;
                levelCounts[level] = (levelCounts[level] || 0) + 1;
              });

              // Calculate evaluation distribution (5-point scale)
              let totalWellAbove = 0;
              let totalAbove = 0;
              let totalTarget = 0;
              let totalBelow = 0;
              let totalWellBelow = 0;
              let totalEvaluations = 0;

              assessedSubs.forEach((sub) => {
                const evals = progress[sub._id].evaluations || [];
                evals.forEach((e) => {
                  totalEvaluations++;
                  if (e.evaluation === "well_above") totalWellAbove++;
                  else if (e.evaluation === "above") totalAbove++;
                  else if (e.evaluation === "target") totalTarget++;
                  else if (e.evaluation === "below") totalBelow++;
                  else if (e.evaluation === "well_below") totalWellBelow++;
                });
              });

              const hasEvaluations = totalEvaluations > 0;
              const wellAbovePercent = hasEvaluations ? (totalWellAbove / totalEvaluations) * 100 : 0;
              const abovePercent = hasEvaluations ? (totalAbove / totalEvaluations) * 100 : 0;
              const targetPercent = hasEvaluations ? (totalTarget / totalEvaluations) * 100 : 0;
              const belowPercent = hasEvaluations ? (totalBelow / totalEvaluations) * 100 : 0;
              const wellBelowPercent = hasEvaluations ? (totalWellBelow / totalEvaluations) * 100 : 0;

              return (
                <Card key={comp._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{comp.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {assessedCount}/{subs.length} assessed
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => openDetailsDialog(comp)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {assessedCount > 0 && (
                    <CardContent className="space-y-4">
                      {/* Level Distribution */}
                      <div>
                        <p className="text-sm font-medium mb-2">Level Distribution</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(levelCounts)
                            .sort((a, b) => {
                              const order = ["associate", "intermediate", "senior", "lead", "principal"];
                              return order.indexOf(a[0]) - order.indexOf(b[0]);
                            })
                            .map(([level, count]) => (
                              <Badge key={level} variant={getLevelBadgeVariant(level)} className="capitalize">
                                {level}: {count}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      {/* Performance Summary - 5-point scale */}
                      {hasEvaluations && (
                        <div>
                          <p className="text-sm font-medium mb-2">Performance Summary</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Well Above</span>
                              <div className="flex items-center gap-2">
                                <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-600" style={{ width: `${wellAbovePercent}%` }} />
                                </div>
                                <span className="font-medium w-10 text-right">{Math.round(wellAbovePercent)}%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Above</span>
                              <div className="flex items-center gap-2">
                                <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500" style={{ width: `${abovePercent}%` }} />
                                </div>
                                <span className="font-medium w-10 text-right">{Math.round(abovePercent)}%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">At Target</span>
                              <div className="flex items-center gap-2">
                                <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${targetPercent}%` }} />
                                </div>
                                <span className="font-medium w-10 text-right">{Math.round(targetPercent)}%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Below</span>
                              <div className="flex items-center gap-2">
                                <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500" style={{ width: `${belowPercent}%` }} />
                                </div>
                                <span className="font-medium w-10 text-right">{Math.round(belowPercent)}%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Well Below</span>
                              <div className="flex items-center gap-2">
                                <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-destructive" style={{ width: `${wellBelowPercent}%` }} />
                                </div>
                                <span className="font-medium w-10 text-right">{Math.round(wellBelowPercent)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
        <div>
          {/* Competency Trend Chart - only show if there are 2+ completed assessments */}
          {trendData.length >= 2 && <CompetencyTrendChart trendData={trendData} competencies={competencies as any} />}
          <Card className="bg-background border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Skill Mapping</CardTitle>
                {overallSummary?.hasData && (
                  <div className="flex items-center gap-2">
                    {overallSummary.trend === "level-up" && (
                      <Badge variant="default" className="bg-green-600">
                        Advanced
                      </Badge>
                    )}
                    {overallSummary.trend === "needs-support" && <Badge variant="destructive">Developing</Badge>}
                    {overallSummary.trend === "on-track" && <Badge variant="secondary">Progressing</Badge>}
                  </div>
                )}
              </div>
              {overallSummary?.hasData && (
                <p className="text-sm text-muted-foreground">Average Level: {overallSummary.overallAverage} / 5.0</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={overallSummary?.chartData || []}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="competency" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 5]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <Radar
                      name="Skill Level"
                      dataKey="level"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      formatter={(value: number) => [value.toFixed(1), "Level"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="p-4 bg-muted/50 rounded-md space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Recommendation:</strong> {overallSummary?.recommendation}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Scale: 1 = Associate, 2 = Intermediate, 3 = Senior, 4 = Lead, 5 = Principal
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AssessmentWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingAssessmentId(null);
        }}
        memberId={member._id}
        memberRole={member.role}
        competencies={competencies as any}
        subCompetencies={subCompetencies as any}
        existingAssessmentId={editingAssessmentId}
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
    </div>
  );
};

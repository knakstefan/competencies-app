import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CompetencyTrendChart } from "@/components/CompetencyTrendChart";
import { AssessmentDetailsDialog } from "@/components/AssessmentDetailsDialog";
import { AssessmentWizard } from "@/components/AssessmentWizard";
import { AssessmentOverviewDialog } from "@/components/AssessmentOverviewDialog";
import { PerformanceSnapshot } from "./PerformanceSnapshot";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ClipboardCheck,
  Plus,
  PlayCircle,
  Pencil,
  MoreHorizontal,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { keyToLabel } from "@/lib/levelUtils";
import { getRatingOption } from "@/lib/ratingConstants";
import type { TabCommonProps, Competency, SubCompetency } from "./types";

export function OverviewTab(props: TabCommonProps) {
  const {
    member,
    isAdmin,
    roleId,
    levels,
    competencies,
    subCompetencies,
    sortedAssessments,
    completedAssessments,
    progressData,
    progress,
    trendData,
    competencyGapData,
    overallStats,
    overallSummary,
    currentLevelKey,
    targetLevelKey,
    planContent,
    readinessPercent,
    overallTrendLabel,
    assessmentDateRange,
    getCompetencyTrend,
    getAssessmentDistribution,
  } = props;

  // Overview state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);

  // Assessment state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [overviewDialogOpen, setOverviewDialogOpen] = useState(false);
  const [selectedAssessmentForOverview, setSelectedAssessmentForOverview] = useState<{ id: string; date: number } | null>(null);
  const [showAllAssessments, setShowAllAssessments] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);

  const { toast } = useToast();
  const removeAssessment = useMutation(api.assessments.remove);

  const hasCompletedAssessments = completedAssessments.length > 0;
  const latestSummary = completedAssessments[0]?.generatedSummary as {
    overallNarrative?: string;
    strengths?: Array<{ competency: string; detail: string }>;
    areasNeedingSupport?: Array<{
      competency: string;
      subCompetency: string;
      criterion: string;
      rating: string;
      guidance: string;
    }>;
    overallReadiness?: string;
  } | undefined;

  // Assessment logic
  const draftAssessment = sortedAssessments.find((a: any) => a.status === "draft");

  const draftProgressCount = useMemo(() => {
    if (!draftAssessment || !progressData) return 0;
    return (progressData as any[]).filter((p: any) => p.assessmentId === draftAssessment._id).length;
  }, [draftAssessment, progressData]);

  const totalSubCompetencies = subCompetencies?.length || 0;
  const visibleCompleted = showAllAssessments ? completedAssessments : completedAssessments.slice(0, 3);

  const handleDeleteClick = (assessmentId: string) => {
    setAssessmentToDelete(assessmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assessmentToDelete) return;
    try {
      await removeAssessment({ id: assessmentToDelete as Id<"assessments"> });
      toast({ title: "Success", description: "Assessment deleted successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to delete assessment", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const openAssessmentOverview = (assessmentId: string, assessmentDate: number) => {
    setSelectedAssessmentForOverview({ id: assessmentId, date: assessmentDate });
    setOverviewDialogOpen(true);
  };

  // Overview logic
  const getCompTrendFromData = (compId: string) => {
    if (trendData.length < 2) return null;
    const firstScore = trendData[0].competencyScores[compId] || 0;
    const lastScore = trendData[trendData.length - 1].competencyScores[compId] || 0;
    const diff = lastScore - firstScore;
    if (diff > 0.3) return "improving";
    if (diff < -0.3) return "declining";
    return "stable";
  };

  const openDetailsDialog = (comp: Competency) => {
    setSelectedCompetency(comp);
    setDetailsDialogOpen(true);
  };

  // Empty state: no completed assessments
  if (!hasCompletedAssessments) {
    return (
      <div className="space-y-4">
        {/* Draft banner or Start CTA for admins */}
        {draftAssessment && isAdmin ? (
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(draftAssessment._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete draft
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !draftAssessment && isAdmin ? (
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
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No assessments yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ask your administrator to create an assessment.
            </p>
          </div>
        )}

        {/* Dialogs */}
        <AssessmentWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setEditingAssessmentId(null); }}
          memberId={member._id}
          memberRole={member.role}
          memberName={member.name}
          competencies={competencies as any}
          subCompetencies={subCompetencies as any}
          existingAssessmentId={editingAssessmentId}
          levels={levels}
          roleId={roleId}
        />

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
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Draft banner or Start CTA */}
          {draftAssessment && isAdmin ? (
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(draftAssessment._id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete draft
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : !draftAssessment && isAdmin ? (
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

          {/* AI Assessment Summary */}
          {latestSummary?.overallNarrative && (
            <Card className="relative overflow-hidden bg-primary/8 border-primary/25">
              <div className="h-0.5 bg-gradient-knak" />
              <CardHeader className="pb-0 px-5 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    AI Assessment Summary
                  </CardTitle>
                  {completedAssessments[0]?.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(completedAssessments[0].completedAt), "MMMM yyyy")} assessment
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-3 space-y-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {latestSummary.overallNarrative}
                </p>

                {latestSummary.strengths && latestSummary.strengths.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border/30">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-500">Strengths</span>
                    <div className="space-y-1.5">
                      {latestSummary.strengths.map((s, i) => (
                        <div key={i} className="text-sm pl-3 border-l-2 border-green-500/30">
                          <span className="font-medium text-foreground">{s.competency}</span>
                          <span className="text-muted-foreground"> — {s.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {latestSummary.areasNeedingSupport && latestSummary.areasNeedingSupport.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border/30">
                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">Focus Areas</span>
                    <div className="space-y-2.5">
                      {latestSummary.areasNeedingSupport.map((a, i) => (
                        <div key={i} className="text-sm pl-3 border-l-2 border-orange-500/30 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/40 shrink-0">
                              {getRatingOption(a.rating)?.label || a.rating}
                            </Badge>
                            <span className="font-medium text-foreground">{a.competency}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{a.subCompetency} · {a.criterion}</p>
                          {a.guidance && (
                            <p className="text-xs text-muted-foreground/80">{a.guidance}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {latestSummary.overallReadiness && (
                  <div className="space-y-1.5 pt-3 border-t border-border/40">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">Readiness</span>
                    <p className="text-sm text-muted-foreground">{latestSummary.overallReadiness}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Competency Analysis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Competency Analysis</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Above</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Target</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Below</span>
              </div>
            </div>

            <Accordion type="multiple">
              {competencyGapData.map((comp) => {
                const compTrend = getCompTrendFromData(comp._id);
                const summaryScores = overallSummary?.competencyScores?.[comp._id];
                const statusTrend = summaryScores
                  ? getCompetencyTrend(comp._id, summaryScores)
                  : "not-assessed";
                const hasEvals = comp.totalEvals > 0;
                const abovePct = hasEvals ? (comp.aboveCount / comp.totalEvals) * 100 : 0;
                const targetPct = hasEvals ? (comp.targetCount / comp.totalEvals) * 100 : 0;
                const belowPct = hasEvals ? (comp.belowCount / comp.totalEvals) * 100 : 0;

                return (
                  <AccordionItem key={comp._id} value={comp._id} className="border rounded-lg px-4 mb-3">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex-1 min-w-0 space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate">{comp.title}</h4>
                          {hasEvals && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {comp.score.toFixed(1)} / 5.0
                            </span>
                          )}
                          <div className="flex items-center gap-2 ml-auto mr-2">
                            {compTrend === "improving" && (
                              <Badge variant="default" className="bg-green-600 text-xs gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Improving
                              </Badge>
                            )}
                            {compTrend === "declining" && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Declining
                              </Badge>
                            )}
                            {compTrend === "stable" && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Minus className="w-3 h-3" />
                                Stable
                              </Badge>
                            )}
                            {!compTrend && statusTrend === "excelling" && (
                              <Badge variant="default" className="bg-green-600 text-xs">Excelling</Badge>
                            )}
                            {!compTrend && statusTrend === "needs-support" && (
                              <Badge variant="destructive" className="text-xs">Needs focus</Badge>
                            )}
                            {!compTrend && statusTrend === "on-track" && (
                              <Badge variant="secondary" className="text-xs">On track</Badge>
                            )}
                          </div>
                        </div>
                        {hasEvals && (
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                            {abovePct > 0 && <div className="h-full bg-green-500" style={{ width: `${abovePct}%` }} />}
                            {targetPct > 0 && <div className="h-full bg-primary" style={{ width: `${targetPct}%` }} />}
                            {belowPct > 0 && <div className="h-full bg-orange-500" style={{ width: `${belowPct}%` }} />}
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          {comp.assessedCount}/{comp.totalSubs} sub-competencies assessed
                        </p>

                        {comp.belowTargetSubs.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-orange-500">Below-target areas</p>
                            {comp.belowTargetSubs.map((sub, idx) => (
                              <div key={idx} className="pl-3 border-l-2 border-orange-500/30">
                                <p className="text-xs font-medium text-foreground">{sub.subTitle}</p>
                                <ul className="mt-0.5 space-y-0.5">
                                  {sub.criteria.map((c, cIdx) => (
                                    <li key={cIdx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <span className="text-orange-500 mt-0.5 shrink-0">&bull;</span>
                                      <span>{c.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={() => openDetailsDialog({ _id: comp._id, title: comp.title, code: "", orderIndex: 0 })}
                        >
                          View full breakdown
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Trend chart */}
          {trendData.length >= 2 && competencies && (
            <Card className="relative overflow-hidden">
              <div className="h-0.5 bg-gradient-knak" />
              <div className="p-4">
                <CompetencyTrendChart trendData={trendData} competencies={competencies as any} />
              </div>
            </Card>
          )}

          {/* Assessment History */}
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
                      onClick={() => openAssessmentOverview(assessment._id, assessment.completedAt || assessment._creationTime)}
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
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAssessmentId(assessment._id);
                                  setWizardOpen(true);
                                }}
                                title="Edit assessment"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(assessment._id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete assessment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {/* Mini stacked bar */}
                        {dist && (
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            {dist.above > 0 && <div className="h-full bg-green-500" style={{ width: `${dist.above}%` }} />}
                            {dist.target > 0 && <div className="h-full bg-primary" style={{ width: `${dist.target}%` }} />}
                            {dist.below > 0 && <div className="h-full bg-orange-500" style={{ width: `${dist.below}%` }} />}
                          </div>
                        )}
                        {/* AI Summary */}
                        {assessment.generatedSummary && (
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 text-primary" />
                              <span className="text-xs font-medium text-muted-foreground">AI Summary</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                              {assessment.generatedSummary.overallNarrative}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
              {completedAssessments.length > 3 && !showAllAssessments && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllAssessments(true)}
                  className="gap-1"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show all {completedAssessments.length} assessments
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">
          {/* Level progression */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm capitalize">
              {keyToLabel(levels, currentLevelKey)}
            </Badge>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant="default" className="text-sm bg-primary capitalize">
              {targetLevelKey ? keyToLabel(levels, targetLevelKey) : "Max Level"}
            </Badge>
          </div>

          {/* Readiness indicator */}
          {overallStats.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Readiness</span>
                <span className="font-medium">{readinessPercent}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Performance snapshot card */}
          <PerformanceSnapshot
            overallStats={overallStats}
            completedCount={completedAssessments.length}
            dateRange={assessmentDateRange}
            overallTrend={overallTrendLabel}
          />

          {/* Radar chart — Skill Overview */}
          <Card className={`relative overflow-hidden ${!overallSummary?.hasData ? "opacity-40" : ""}`}>
            <div className="h-0.5 bg-gradient-knak" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Skill Overview</CardTitle>
                {overallSummary?.hasData && (
                  <span className="text-xs text-muted-foreground">
                    {overallSummary.overallAverage} / 5.0
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={overallSummary?.chartData || []} cx="50%" cy="50%" outerRadius="55%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="competency"
                      tick={({ payload, x, y, textAnchor }: any) => {
                        const label = payload.value as string;
                        const maxLen = 16;
                        let lines: string[];
                        if (label.length <= maxLen) {
                          lines = [label];
                        } else {
                          const mid = label.lastIndexOf(' ', maxLen);
                          const splitAt = mid > 0 ? mid : maxLen;
                          lines = [label.slice(0, splitAt), label.slice(splitAt).trimStart()];
                        }
                        return (
                          <text x={x} y={y} textAnchor={textAnchor} fontSize={10} className="fill-muted-foreground">
                            {lines.map((line, i) => (
                              <tspan key={i} x={x} dy={i === 0 ? 0 : 12}>{line}</tspan>
                            ))}
                          </text>
                        );
                      }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                    <Radar name="Skill Level" dataKey="level" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                      formatter={(value: number) => [value.toFixed(1), "Level"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Dialog */}
      {selectedCompetency && (
        <AssessmentDetailsDialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          competency={selectedCompetency}
          subCompetencies={(subCompetencies as SubCompetency[]).filter((sc) => sc.competencyId === selectedCompetency._id)}
          progress={progress}
        />
      )}

      {/* Assessment Wizard */}
      <AssessmentWizard
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditingAssessmentId(null); }}
        memberId={member._id}
        memberRole={member.role}
        memberName={member.name}
        competencies={competencies as any}
        subCompetencies={subCompetencies as any}
        existingAssessmentId={editingAssessmentId}
        levels={levels}
        roleId={roleId}
      />

      {/* Assessment Overview Dialog */}
      {selectedAssessmentForOverview && (
        <AssessmentOverviewDialog
          open={overviewDialogOpen}
          onClose={() => { setOverviewDialogOpen(false); setSelectedAssessmentForOverview(null); }}
          assessmentId={selectedAssessmentForOverview.id}
          assessmentDate={selectedAssessmentForOverview.date}
          competencies={competencies as Competency[]}
          subCompetencies={subCompetencies as SubCompetency[]}
        />
      )}

      {/* Delete Confirmation */}
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
    </>
  );
}

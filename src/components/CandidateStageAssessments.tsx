import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Check, FileText, Loader2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HiringCandidate } from "./HiringManagement";
import { SubCompetency as SubCompetencyType } from "@/types/competency";
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

import { ManagerInterviewWizard } from "./wizards/ManagerInterviewWizard";
import { PortfolioReviewWizard } from "./wizards/PortfolioReviewWizard";
import { CandidateAssessmentWizard } from "./CandidateAssessmentWizard";

interface CandidateStageAssessmentsProps {
  candidate: HiringCandidate;
  isAdmin: boolean;
  competencies: Array<{ _id: string; title: string; code: string; orderIndex: number }>;
  subCompetencies: SubCompetencyType[];
  onDataChange?: () => void;
}

const STAGE_ORDER = ["manager_interview", "portfolio_review", "team_interview"];

const STAGE_NAMES: Record<string, string> = {
  manager_interview: "Manager Interview",
  portfolio_review: "Portfolio Review",
  team_interview: "Team Interview",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  manager_interview: "Covers background, collaboration style, and design approach through structured questions.",
  portfolio_review: "Evaluates design work across competency areas with level-specific criteria.",
  team_interview: "Assesses competencies against the framework criteria for the target level.",
};

export const CandidateStageAssessments = ({
  candidate,
  isAdmin,
  competencies,
  subCompetencies,
  onDataChange,
}: CandidateStageAssessmentsProps) => {
  const assessments = useQuery(api.candidateAssessments.listForCandidate, {
    candidateId: candidate._id as Id<"hiringCandidates">,
  });
  const removeAssessment = useMutation(api.candidateAssessments.remove);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeWizard, setActiveWizard] = useState<string | null>(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);

  const { toast } = useToast();
  const loading = assessments === undefined;

  const sortedAssessments = [...(assessments || [])].sort(
    (a, b) => a._creationTime - b._creationTime
  );

  const getAssessmentForStage = (stage: string) => {
    return sortedAssessments.find((a) => a.stage === stage);
  };

  const handleCreate = (stage: string) => {
    setEditingAssessmentId(null);
    setActiveWizard(stage);
  };

  const handleEdit = (assessment: any) => {
    setEditingAssessmentId(assessment._id);
    setActiveWizard(assessment.stage);
  };

  const handleWizardClose = () => {
    setActiveWizard(null);
    setEditingAssessmentId(null);
    onDataChange?.();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await removeAssessment({ id: deletingId as Id<"candidateAssessments"> });
      toast({ title: "Success", description: "Assessment deleted" });
      onDataChange?.();
    } catch {
      toast({ title: "Error", description: "Failed to delete assessment", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isTerminal = candidate.currentStage === "hired" || candidate.currentStage === "rejected";
  const activeStageIndex = STAGE_ORDER.indexOf(candidate.currentStage);

  return (
    <>
      <div className="space-y-4">
        {STAGE_ORDER.map((stage, index) => {
          const assessment = getAssessmentForStage(stage);
          const isActiveStage = stage === candidate.currentStage;
          const isPastStage = isTerminal || index < activeStageIndex;
          const isFutureStage = !isTerminal && !isActiveStage && index > activeStageIndex;

          // Active stage — hero card
          if (isActiveStage && !isTerminal) {
            return (
              <div key={stage} className="animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
                {!assessment ? (
                  // Active stage, no assessment — CTA card
                  <button
                    onClick={() => isAdmin && handleCreate(stage)}
                    disabled={!isAdmin}
                    className={cn(
                      "w-full text-left rounded-xl border-2 border-dashed border-primary/40 p-6 transition-all duration-300",
                      isAdmin && "hover:border-primary/60 hover:bg-primary/[0.02] cursor-pointer group"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 animate-pulse">
                        <Plus className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{STAGE_NAMES[stage]}</h3>
                          <Badge variant="default" className="text-xs">Current Stage</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{STAGE_DESCRIPTIONS[stage]}</p>
                      </div>
                      {isAdmin && (
                        <Button size="lg" className="gap-2 shrink-0">
                          <Plus className="w-4 h-4" />
                          Start Assessment
                        </Button>
                      )}
                    </div>
                  </button>
                ) : assessment.status === "draft" ? (
                  // Active stage, draft — continue banner
                  <Card
                    className="relative overflow-hidden cursor-pointer ring-1 ring-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5"
                    onClick={() => handleEdit(assessment)}
                  >
                    <div className="h-0.5 bg-gradient-knak" />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <PlayCircle className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{STAGE_NAMES[stage]}</h3>
                              <Badge variant="secondary">Draft</Badge>
                              <Badge variant="default" className="text-xs">Current Stage</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Started {formatDate(new Date(assessment._creationTime).toISOString())}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="lg" className="gap-2">
                            <PlayCircle className="w-4 h-4" />
                            Continue
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeletingId(assessment._id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Active stage, completed
                  <Card
                    className={cn(
                      "relative overflow-hidden transition-all",
                      isAdmin && "cursor-pointer hover:shadow-xl hover:shadow-primary/5"
                    )}
                    onClick={() => isAdmin && handleEdit(assessment)}
                  >
                    <div className="h-0.5 bg-gradient-knak" />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Check className="w-6 h-6 text-green-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{STAGE_NAMES[stage]}</h3>
                              <Badge variant="default" className="text-xs">Completed</Badge>
                              <Badge variant="default" className="text-xs">Current Stage</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Completed {assessment.completedAt && formatDate(assessment.completedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {assessment.overallScore != null && (
                            <div className="text-right">
                              <span className="text-2xl font-bold">{assessment.overallScore.toFixed(1)}</span>
                              <span className="text-sm text-muted-foreground"> / 5.0</span>
                            </div>
                          )}
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(assessment); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeletingId(assessment._id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          }

          // Past or terminal completed stages — compact cards in a row
          if (isPastStage || isTerminal) {
            return (
              <div key={stage} className="animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
                {!assessment ? (
                  <Card className="opacity-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{STAGE_NAMES[stage]}</p>
                          <p className="text-xs text-muted-foreground">Not started</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card
                    className={cn(
                      "relative overflow-hidden transition-all",
                      isAdmin && "cursor-pointer hover:shadow-xl hover:shadow-primary/5"
                    )}
                    onClick={() => isAdmin && handleEdit(assessment)}
                  >
                    <div className="h-0.5 bg-gradient-knak" />
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{STAGE_NAMES[stage]}</span>
                              <Badge variant={assessment.status === "completed" ? "default" : "secondary"} className="text-xs">
                                {assessment.status === "completed" ? "Completed" : "Draft"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {assessment.completedAt ? formatDate(assessment.completedAt) : `Started ${formatDate(new Date(assessment._creationTime).toISOString())}`}
                            </p>
                          </div>
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
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeletingId(assessment._id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          }

          // Future stages — muted placeholders
          if (isFutureStage) {
            return (
              <div key={stage} className="animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
                <Card className="opacity-40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{STAGE_NAMES[stage]}</p>
                        <p className="text-xs text-muted-foreground">Upcoming</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          }

          return null;
        })}
      </div>

      <ManagerInterviewWizard
        open={activeWizard === "manager_interview"}
        onClose={handleWizardClose}
        candidate={candidate}
        existingAssessmentId={editingAssessmentId}
      />

      <PortfolioReviewWizard
        open={activeWizard === "portfolio_review"}
        onClose={handleWizardClose}
        candidate={candidate}
        existingAssessmentId={editingAssessmentId}
      />

      <CandidateAssessmentWizard
        open={activeWizard === "team_interview"}
        onClose={handleWizardClose}
        candidate={candidate}
        competencies={competencies}
        subCompetencies={subCompetencies}
        existingAssessmentId={editingAssessmentId}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assessment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

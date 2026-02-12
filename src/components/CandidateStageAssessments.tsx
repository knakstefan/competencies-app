import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Check, FileText, Loader2 } from "lucide-react";
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

  // Sort by creation time ascending
  const sortedAssessments = [...(assessments || [])].sort(
    (a, b) => a._creationTime - b._creationTime
  );

  const getAssessmentForStage = (stage: string) => {
    return sortedAssessments.find((a) => a.stage === stage);
  };

  const hasCurrentStageAssessment = !!getAssessmentForStage(candidate.currentStage);

  const handleCreate = () => {
    setEditingAssessmentId(null);
    setActiveWizard(candidate.currentStage);
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
      toast({
        title: "Success",
        description: "Assessment deleted",
      });
      onDataChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
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

  const getScoreDisplay = (stage: string, score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    const maxScore = stage === "manager_interview" ? 4 : 5;
    return `${score.toFixed(1)}/${maxScore}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assessments</CardTitle>
          {isAdmin && !hasCurrentStageAssessment && (
            <Button onClick={handleCreate} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create {STAGE_NAMES[candidate.currentStage]} Assessment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STAGE_ORDER.map((stage) => {
              const assessment = getAssessmentForStage(stage);
              const isActiveStage = stage === candidate.currentStage;
              const isEditable = isActiveStage && isAdmin;

              if (!assessment) {
                return (
                  <div
                    key={stage}
                    className={cn(
                      "p-4 border rounded-lg",
                      isActiveStage ? "border-dashed border-primary/50" : "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{STAGE_NAMES[stage]}</p>
                        <p className="text-sm text-muted-foreground">Not started</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={stage}
                  className={cn(
                    "p-4 border rounded-lg transition-colors",
                    isEditable && "cursor-pointer hover:bg-muted/50",
                    !isActiveStage && "opacity-60"
                  )}
                  onClick={() => isEditable && handleEdit(assessment)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{STAGE_NAMES[stage]}</span>
                          <Badge
                            variant={assessment.status === "completed" ? "default" : "secondary"}
                          >
                            {assessment.status === "completed" ? (
                              <span className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Completed
                              </span>
                            ) : (
                              "Draft"
                            )}
                          </Badge>
                          {assessment.overallScore !== undefined && assessment.overallScore !== null && (
                            <Badge variant="outline">
                              Score: {getScoreDisplay(stage, assessment.overallScore)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Started {formatDate(new Date(assessment._creationTime).toISOString())}
                          {assessment.completedAt &&
                            ` • Completed ${formatDate(assessment.completedAt)}`}
                        </p>
                      </div>
                    </div>
                    {isEditable && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(assessment);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(assessment._id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

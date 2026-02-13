import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { HiringStage } from "./HiringManagement";
import { getStageLabel } from "@/lib/stageUtils";

interface CandidateAssessmentListProps {
  candidateId: string;
  currentStage: string;
  isAdmin: boolean;
  onCreateAssessment: () => void;
  onEditAssessment: (assessmentId: string) => void;
  stages?: HiringStage[];
}

export const CandidateAssessmentList = ({
  candidateId,
  currentStage,
  isAdmin,
  onCreateAssessment,
  onEditAssessment,
  stages = [],
}: CandidateAssessmentListProps) => {
  const assessments = useQuery(api.candidateAssessments.listForCandidate, {
    candidateId: candidateId as Id<"hiringCandidates">,
  });
  const removeAssessment = useMutation(api.candidateAssessments.remove);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loading = assessments === undefined;

  // Sort by creation time descending
  const sortedAssessments = [...(assessments || [])].sort(
    (a, b) => b._creationTime - a._creationTime
  );

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await removeAssessment({ id: deletingId as Id<"candidateAssessments"> });
      toast({
        title: "Success",
        description: "Assessment deleted",
      });
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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatStageName = (assessment: any) => {
    // If assessment has a stageId, look up from stages
    if (assessment.stageId) {
      const stage = stages.find((s) => s._id === assessment.stageId);
      if (stage) return stage.title;
    }
    // DB lookup by legacy stage string
    return getStageLabel(assessment.stage, stages);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button onClick={onCreateAssessment} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Assessment
        </Button>
      )}

      {sortedAssessments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No assessments yet.</p>
            {isAdmin && <p className="text-sm">Create one to start evaluating this candidate.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedAssessments.map((assessment) => {
            const isEditable = assessment.stage === currentStage || assessment.stageId === currentStage;
            return (
              <Card
                key={assessment._id}
                className={cn(
                  "transition-colors",
                  isEditable ? "cursor-pointer hover:bg-muted/50" : "opacity-60"
                )}
                onClick={() => isEditable && onEditAssessment(assessment._id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatStageName(assessment)} Assessment
                        </span>
                        <Badge
                          variant={assessment.status === "completed" ? "default" : "secondary"}
                        >
                          {assessment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {assessment.completedAt
                          ? `Completed ${formatDate(assessment.completedAt)}`
                          : `Started ${formatDate(new Date(assessment._creationTime).toISOString())}`}
                      </p>
                      {assessment.overallScore !== undefined && assessment.overallScore !== null && (
                        <p className="text-sm">
                          Score: <span className="font-medium">{assessment.overallScore.toFixed(1)}</span>
                        </p>
                      )}
                    </div>
                    {isAdmin && isEditable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(assessment._id);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
};

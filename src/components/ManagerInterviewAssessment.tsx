import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Check } from "lucide-react";
import { HiringCandidate } from "./HiringManagement";
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

const RATING_OPTIONS = [
  { value: "well_above", label: "Well Above", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { value: "above", label: "Above", color: "bg-green-500/10 text-green-700 border-green-200" },
  { value: "target", label: "Target", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "below", label: "Below", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
  { value: "well_below", label: "Well Below", color: "bg-red-500/10 text-red-700 border-red-200" },
];

interface ManagerInterviewAssessmentProps {
  candidate: HiringCandidate;
  isAdmin: boolean;
  onDataChange?: () => void;
}

export const ManagerInterviewAssessment = ({
  candidate,
  isAdmin,
  onDataChange,
}: ManagerInterviewAssessmentProps) => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const removeAssessment = useMutation(api.candidateAssessments.remove);

  const allAssessments = useQuery(api.candidateAssessments.listForCandidate, {
    candidateId: candidate._id as Id<"hiringCandidates">,
  });

  const loading = allAssessments === undefined;

  // Filter to only manager_interview assessments and sort by creation time descending
  const assessments = [...(allAssessments || [])]
    .filter((a) => a.stage === "manager_interview")
    .sort((a, b) => b._creationTime - a._creationTime);

  const createAssessment = () => {
    setActiveAssessmentId(null);
    setWizardOpen(true);
  };

  const loadAssessment = (assessmentId: string) => {
    setActiveAssessmentId(assessmentId);
    setWizardOpen(true);
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setActiveAssessmentId(null);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateString = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRatingBadge = (rating: string) => {
    const option = RATING_OPTIONS.find((o) => o.value === rating);
    return option ? (
      <Badge variant="outline" className={option.color}>
        {option.label}
      </Badge>
    ) : null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manager Interview Assessment</CardTitle>
          {isAdmin && (
            <Button onClick={createAssessment} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Assessment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No interview assessments yet.
              {isAdmin && " Click 'New Assessment' to start one."}
            </p>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
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
                        {assessment.overallScore != null && (
                          <Badge variant="outline">
                            Score: {assessment.overallScore.toFixed(1)}/5
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Started {formatDate(assessment._creationTime)}
                        {assessment.completedAt &&
                          ` • Completed ${formatDateString(assessment.completedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadAssessment(assessment._id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(assessment._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ManagerInterviewWizard
        open={wizardOpen}
        onClose={handleWizardClose}
        candidate={candidate}
        existingAssessmentId={activeAssessmentId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this interview assessment and all its
              responses. This action cannot be undone.
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

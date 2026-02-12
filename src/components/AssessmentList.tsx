import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
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

interface AssessmentListProps {
  memberId: string;
  onCreateAssessment: () => void;
  onEditAssessment: (assessmentId: string) => void;
  onAssessmentDeleted?: () => void;
}

export const AssessmentList = ({ memberId, onCreateAssessment, onEditAssessment, onAssessmentDeleted }: AssessmentListProps) => {
  const assessments = useQuery(api.assessments.listForMember, { memberId: memberId as Id<"teamMembers"> });
  const removeAssessment = useMutation(api.assessments.remove);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const loading = assessments === undefined;

  // Sort by creation time descending
  const sortedAssessments = [...(assessments || [])].sort(
    (a, b) => b._creationTime - a._creationTime
  );

  const handleDeleteClick = (assessmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssessmentToDelete(assessmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assessmentToDelete) return;

    try {
      await removeAssessment({ id: assessmentToDelete as Id<"assessments"> });

      toast({
        title: "Success",
        description: "Assessment deleted successfully",
      });

      onAssessmentDeleted?.();
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const getAssessmentTitle = (assessment: any) => {
    const date = assessment.completedAt || new Date(assessment._creationTime).toISOString();
    const formattedDate = format(new Date(date), "MMM dd, yyyy");
    const formattedTime = format(new Date(date), "h:mm a");

    if (assessment.status === "completed") {
      return `Assessment - ${formattedDate} at ${formattedTime}`;
    }
    return `Draft Assessment - ${formattedDate}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold">Assessments</h3>
        <Button onClick={onCreateAssessment}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {sortedAssessments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No assessments yet. Create one to get started.</p>
            <p className="text-center text-sm text-muted-foreground/70 mt-2">
              Assessments evaluate each competency against level-specific criteria. Takes ~15 min. Progress saves automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedAssessments.map((assessment) => (
            <Card
              key={assessment._id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onEditAssessment(assessment._id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <CardTitle className="text-base">{getAssessmentTitle(assessment)}</CardTitle>
                      {assessment.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed on {format(new Date(assessment.completedAt), "PPP 'at' p")}
                        </p>
                      )}
                    </div>
                    <Badge variant={assessment.status === "completed" ? "default" : "secondary"}>
                      {assessment.status === "completed" ? "Completed" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(assessment._id, e)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {assessment.notes && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{assessment.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assessment? This will also delete all associated progress data and
              criteria evaluations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

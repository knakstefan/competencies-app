import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { HiringPipeline } from "./HiringPipeline";
import { CandidateList } from "./CandidateList";
import { CandidateForm } from "./CandidateForm";
import { SkillsRecommendation } from "./SkillsRecommendation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
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

export interface HiringCandidate {
  _id: string;
  name: string;
  email?: string;
  portfolioUrl?: string;
  currentStage: string;
  targetRole: string;
  notes?: string;
  _creationTime: number;
}

interface HiringManagementProps {
  isAdmin: boolean;
}

export const HiringManagement = ({ isAdmin }: HiringManagementProps) => {
  const navigate = useNavigate();
  const candidates = useQuery(api.candidates.listWithAssessmentStatus);
  const removeCandidate = useMutation(api.candidates.remove);
  const updateStage = useMutation(api.candidates.updateStage);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<HiringCandidate | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<HiringCandidate | null>(null);
  const { toast } = useToast();

  const loading = candidates === undefined;

  const handleDelete = async () => {
    if (!deletingCandidate) return;

    try {
      await removeCandidate({ id: deletingCandidate._id as Id<"hiringCandidates"> });
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive",
      });
    }
    setDeletingCandidate(null);
  };

  const handleStageChange = async (candidateId: string, newStage: string) => {
    try {
      await updateStage({ id: candidateId as Id<"hiringCandidates">, currentStage: newStage });
      toast({
        title: "Success",
        description: "Candidate stage updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stage",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
      {/* Main content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Candidates</CardTitle>
          {isAdmin && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <CandidateList
            candidates={(candidates || []) as HiringCandidate[]}
            loading={loading}
            isAdmin={isAdmin}
            onView={(candidate) => navigate(`/hiring/${candidate._id}`)}
            onEdit={(candidate) => {
              setEditingCandidate(candidate);
              setIsFormOpen(true);
            }}
            onDelete={setDeletingCandidate}
            onStageChange={handleStageChange}
          />
        </CardContent>
      </Card>

      {/* Right sidebar */}
      <div className="space-y-6">
        <HiringPipeline candidates={(candidates || []) as HiringCandidate[]} />
        <SkillsRecommendation />
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCandidate ? "Edit Candidate" : "Add Candidate"}
            </DialogTitle>
          </DialogHeader>
          <CandidateForm
            editingCandidate={editingCandidate}
            onSuccess={() => {
              setEditingCandidate(null);
              setIsFormOpen(false);
            }}
            onCancel={() => {
              setEditingCandidate(null);
              setIsFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCandidate} onOpenChange={() => setDeletingCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCandidate?.name}? This action cannot be
              undone and will remove all assessment data for this candidate.
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

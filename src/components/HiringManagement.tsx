import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { HiringPipeline } from "./HiringPipeline";
import { CandidateList } from "./CandidateList";
import { CandidateForm } from "./CandidateForm";
import { CandidateProgressView } from "./CandidateProgressView";
import { SkillsRecommendation } from "./SkillsRecommendation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowLeft, ExternalLink } from "lucide-react";
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
  const candidates = useQuery(api.candidates.list);
  const removeCandidate = useMutation(api.candidates.remove);
  const updateStage = useMutation(api.candidates.updateStage);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<HiringCandidate | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<HiringCandidate | null>(null);
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

  const handleStageChangeAndRefresh = async (candidateId: string, newStage: string) => {
    await handleStageChange(candidateId, newStage);
    if (viewingCandidate && viewingCandidate._id === candidateId) {
      setViewingCandidate((prev) =>
        prev ? { ...prev, currentStage: newStage } : null
      );
    }
  };

  if (viewingCandidate) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setViewingCandidate(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold">{viewingCandidate.name}</h2>
              <Badge variant="outline">{viewingCandidate.targetRole}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
              {viewingCandidate.email && (
                <span>{viewingCandidate.email}</span>
              )}
              {viewingCandidate.portfolioUrl && (
                <a
                  href={viewingCandidate.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Portfolio
                </a>
              )}
            </div>
            {viewingCandidate.notes && (
              <p className="mt-2 text-sm text-muted-foreground">{viewingCandidate.notes}</p>
            )}
          </div>
        </div>

        <CandidateProgressView
          candidate={viewingCandidate}
          isAdmin={isAdmin}
          onStageChange={handleStageChangeAndRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HiringPipeline candidates={(candidates || []) as HiringCandidate[]} />
        <SkillsRecommendation />
      </div>

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
            onView={setViewingCandidate}
            onEdit={(candidate) => {
              setEditingCandidate(candidate);
              setIsFormOpen(true);
            }}
            onDelete={setDeletingCandidate}
            onStageChange={handleStageChange}
          />
        </CardContent>
      </Card>

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

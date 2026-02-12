import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { CandidateForm } from "./CandidateForm";
import { SkillsRecommendation } from "./SkillsRecommendation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  Plus,
  UserPlus,
  MoreVertical,
  SlidersVertical,
  Pencil,
  Trash2,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Users,
  CircleCheck,
  Clock,
  CircleX,
} from "lucide-react";

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

interface CandidateWithStatus extends HiringCandidate {
  currentStageCompleted?: boolean;
  currentStageScore?: number | null;
}

interface HiringManagementProps {
  isAdmin: boolean;
  roleId?: Id<"roles">;
}

const STAGES = [
  { key: "manager_interview", label: "Manager Interview" },
  { key: "portfolio_review", label: "Portfolio Review" },
  { key: "team_interview", label: "Team Interview" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

const getStageLabel = (stage: string) =>
  STAGES.find((s) => s.key === stage)?.label || stage.replace(/_/g, " ");

const getStageBadgeClass = (stage: string) => {
  switch (stage) {
    case "hired":
      return "bg-success text-success-foreground hover:bg-success/90";
    case "rejected":
      return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
    default:
      return "";
  }
};

const getStageBadgeVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (stage) {
    case "hired":
      return "default";
    case "rejected":
      return "destructive";
    case "team_interview":
      return "secondary";
    default:
      return "outline";
  }
};

export const HiringManagement = ({ isAdmin, roleId }: HiringManagementProps) => {
  const navigate = useNavigate();
  const candidates = useQuery(
    roleId ? api.candidates.listWithAssessmentStatusByRole : api.candidates.listWithAssessmentStatus,
    roleId ? { roleId } : {}
  );
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

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const candidateList = (candidates || []) as CandidateWithStatus[];
  const activeCount = candidateList.filter(
    (c) => c.currentStage !== "hired" && c.currentStage !== "rejected"
  ).length;
  const hiredCount = candidateList.filter((c) => c.currentStage === "hired").length;
  const rejectedCount = candidateList.filter((c) => c.currentStage === "rejected").length;

  // Empty state
  if (candidateList.length === 0) {
    return (
      <>
        <div className="relative flex flex-col items-center justify-center min-h-[60vh]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[700px] h-[500px] rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px)
                `,
                backgroundSize: "80px 80px",
                mask: "radial-gradient(ellipse 50% 40% at 50% 45%, black 0%, transparent 100%)",
                WebkitMask:
                  "radial-gradient(ellipse 50% 40% at 50% 45%, black 0%, transparent 100%)",
              }}
            />
          </div>

          <div className="relative z-10 text-center max-w-lg">
            <div
              className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-card flex items-center justify-center ring-1 ring-border animate-fade-up"
              style={{ animationDelay: "0ms" }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>

            <h1
              className="text-4xl font-bold tracking-tight mb-3 animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              Add your first{" "}
              <span className="gradient-heading">candidate</span>
            </h1>

            <p
              className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto mb-10 animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              Evaluate candidates through a structured pipeline: Manager Interview, Portfolio Review, and Team Interview.
            </p>

            {isAdmin && (
              <div
                className="animate-fade-up"
                style={{ animationDelay: "240ms" }}
              >
                <Button
                  onClick={() => setIsFormOpen(true)}
                  size="lg"
                  className="rounded-full px-8 h-12 text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Candidate
                </Button>
              </div>
            )}
          </div>
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
              <DialogTitle>Add Candidate</DialogTitle>
            </DialogHeader>
            <CandidateForm
              editingCandidate={null}
              onSuccess={() => {
                setEditingCandidate(null);
                setIsFormOpen(false);
              }}
              onCancel={() => {
                setEditingCandidate(null);
                setIsFormOpen(false);
              }}
              roleId={roleId}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Populated state
  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">Hiring</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Track candidates through your hiring pipeline.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-primary/70" />
              {candidateList.length} {candidateList.length === 1 ? "Candidate" : "Candidates"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {activeCount} Active
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <CircleCheck className="w-3.5 h-3.5" />
              {hiredCount} Hired
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <CircleX className="w-3.5 h-3.5" />
              {rejectedCount} Rejected
            </span>
          </div>
        </div>

        {/* Skills to look for — full width */}
        <SkillsRecommendation roleId={roleId} />

        {/* Candidate cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {candidateList.map((candidate, index) => (
              <div
                key={candidate._id}
                className="animate-fade-up group"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                  <div className="h-0.5 bg-gradient-knak" />
                  <CardContent className="p-5 flex flex-col">
                    {/* Top row: stage badge + actions */}
                    <div className="flex items-start justify-between mb-3">
                      <Badge
                        variant={getStageBadgeVariant(candidate.currentStage)}
                        className={`text-xs ${getStageBadgeClass(candidate.currentStage)}`}
                      >
                        {getStageLabel(candidate.currentStage)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/roles/${roleId}/hiring/${candidate._id}`)}>
                                <SlidersVertical className="h-4 w-4 mr-2" />
                                Assessment
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Move Stage
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {STAGES.map((stage) => (
                                    <DropdownMenuItem
                                      key={stage.key}
                                      disabled={candidate.currentStage === stage.key}
                                      onClick={() => handleStageChange(candidate._id, stage.key)}
                                    >
                                      {stage.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingCandidate(candidate);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingCandidate(candidate)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Name + target role */}
                    <h3
                      className="text-lg font-semibold mb-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/roles/${roleId}/hiring/${candidate._id}`)}
                    >
                      {candidate.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">{candidate.targetRole}</p>

                    {/* Footer: assessment status */}
                    <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                      {candidate.currentStage === "hired" || candidate.currentStage === "rejected" ? (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {candidate.currentStage === "hired" ? "Hired" : "Rejected"}
                        </span>
                      ) : candidate.currentStageCompleted ? (
                        <>
                          <Badge variant="outline" className="text-xs gap-1 font-normal">
                            <Check className="h-3 w-3" />
                            Assessed
                          </Badge>
                          {candidate.currentStageScore != null && (
                            <span className="text-xs">
                              {candidate.currentStageScore.toFixed(1)}/5
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">Needs assessment</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Add candidate card */}
            {isAdmin && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="animate-fade-up group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/40 p-8 text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02] min-h-[200px]"
                style={{ animationDelay: `${candidateList.length * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-lg border border-dashed border-current flex items-center justify-center transition-colors group-hover:border-primary/40">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Add Candidate</span>
              </button>
            )}
        </div>

      </div>

      {/* Form dialog */}
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
            roleId={roleId}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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

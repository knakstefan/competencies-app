import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { CandidateForm } from "./CandidateForm";
import { SkillsRecommendation } from "./SkillsRecommendation";
import { StagesTab } from "./StagesTab";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronRight,
} from "lucide-react";
import { isTerminalStage, getStageLabel } from "@/lib/stageUtils";
import { useRoleLevels } from "@/hooks/useRoleLevels";

export interface HiringCandidate {
  _id: string;
  name: string;
  email?: string;
  portfolioUrl?: string;
  currentStage: string;
  targetRole: string;
  notes?: string;
  roleId?: string;
  _creationTime: number;
}

export interface HiringStage {
  _id: string;
  roleId: string;
  title: string;
  description?: string;
  stageType: string;
  aiInstructions?: string;
  gateMinScore?: number;
  gateMinRatedPct?: number;
  orderIndex: number;
}

interface CandidateWithStatus extends HiringCandidate {
  currentStageCompleted?: boolean;
  currentStageScore?: number | null;
  hiringRecommendation?: string | null;
  teamFitRating?: string | null;
}

interface HiringManagementProps {
  isAdmin: boolean;
  roleId?: Id<"roles">;
}

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
  if (stage === "hired") return "default";
  if (stage === "rejected") return "destructive";
  return "outline";
};

export const HiringManagement = ({ isAdmin, roleId }: HiringManagementProps) => {
  const { levels } = useRoleLevels(roleId);
  const navigate = useNavigate();
  const candidates = useQuery(
    roleId ? api.candidates.listWithAssessmentStatusByRole : api.candidates.listWithAssessmentStatus,
    // @ts-expect-error — conditional query args; safe because listWithAssessmentStatus takes {}
    roleId ? { roleId } : {}
  );
  const stages = useQuery(
    api.hiringStages.listByRole,
    roleId ? { roleId } : "skip"
  ) as HiringStage[] | undefined;
  const removeCandidate = useMutation(api.candidates.remove);
  const updateStage = useMutation(api.candidates.updateStage);
  const seedDefaults = useMutation(api.hiringStages.seedDefaults);

  const location = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<HiringCandidate | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<HiringCandidate | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "hired" | "rejected" | "all">("active");
  const { toast } = useToast();

  // Open add form if navigated with openAddCandidate state
  const openAddRef = useRef(false);
  useEffect(() => {
    if ((location.state as any)?.openAddCandidate && !openAddRef.current) {
      openAddRef.current = true;
      setIsFormOpen(true);
      // Clear the state so it doesn't re-trigger on re-renders
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Auto-seed default stages if empty
  const seededRef = useRef(false);
  useEffect(() => {
    if (roleId && stages && stages.length === 0 && !seededRef.current) {
      seededRef.current = true;
      seedDefaults({ roleId });
    }
  }, [roleId, stages]);

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

  // Build dynamic stage menu items from DB stages + terminal states
  const stageMenuItems = [
    ...(stages || []).map((s) => ({ key: s._id, label: s.title })),
    { key: "hired", label: "Hired" },
    { key: "rejected", label: "Rejected" },
  ];

  const resolveLabel = (currentStage: string) =>
    getStageLabel(currentStage, stages || []);

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
    (c) => !isTerminalStage(c.currentStage)
  ).length;
  const hiredCount = candidateList.filter((c) => c.currentStage === "hired").length;
  const rejectedCount = candidateList.filter((c) => c.currentStage === "rejected").length;

  const filteredCandidates = statusFilter === "active"
    ? candidateList.filter((c) => !isTerminalStage(c.currentStage))
    : statusFilter === "hired"
    ? candidateList.filter((c) => c.currentStage === "hired")
    : statusFilter === "rejected"
    ? candidateList.filter((c) => c.currentStage === "rejected")
    : candidateList;

  // Group candidates by stage, ordered by pipeline order (terminal stages last)
  const stageOrder = (stages || []).map((s) => s._id);
  const groupedCandidates: { stageKey: string; stageLabel: string; candidates: CandidateWithStatus[] }[] = [];
  const groupMap = new Map<string, CandidateWithStatus[]>();
  for (const c of filteredCandidates) {
    if (!groupMap.has(c.currentStage)) groupMap.set(c.currentStage, []);
    groupMap.get(c.currentStage)!.push(c);
  }
  // Add pipeline stages in order, then terminal stages
  for (const stageId of stageOrder) {
    const members = groupMap.get(stageId);
    if (members && members.length > 0) {
      groupedCandidates.push({ stageKey: stageId, stageLabel: resolveLabel(stageId), candidates: members });
      groupMap.delete(stageId);
    }
  }
  // Remaining non-terminal stages (legacy keys)
  for (const [key, members] of groupMap) {
    if (!isTerminalStage(key)) {
      groupedCandidates.push({ stageKey: key, stageLabel: resolveLabel(key), candidates: members });
    }
  }
  // Terminal stages at the end
  const hiredGroup = groupMap.get("hired");
  if (hiredGroup && hiredGroup.length > 0) {
    groupedCandidates.push({ stageKey: "hired", stageLabel: "Hired", candidates: hiredGroup });
  }
  const rejectedGroup = groupMap.get("rejected");
  if (rejectedGroup && rejectedGroup.length > 0) {
    groupedCandidates.push({ stageKey: "rejected", stageLabel: "Rejected", candidates: rejectedGroup });
  }

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
              levels={levels}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Populated state
  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 animate-fade-up">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-heading">Hiring</h1>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-card/60 ring-1 ring-border/50 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3 h-3 text-primary/70" />
                {candidateList.length}
              </span>
              <div className="w-px h-3 bg-border" />
              <button
                onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
                className={`flex items-center gap-1 transition-colors ${statusFilter === "active" ? "text-primary" : "hover:text-foreground"}`}
              >
                <Clock className="w-3 h-3" />
                {activeCount}
              </button>
              <div className="w-px h-3 bg-border" />
              <button
                onClick={() => setStatusFilter(statusFilter === "hired" ? "all" : "hired")}
                className={`flex items-center gap-1 transition-colors ${statusFilter === "hired" ? "text-primary" : "hover:text-foreground"}`}
              >
                <CircleCheck className="w-3 h-3" />
                {hiredCount}
              </button>
              <div className="w-px h-3 bg-border" />
              <button
                onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
                className={`flex items-center gap-1 transition-colors ${statusFilter === "rejected" ? "text-primary" : "hover:text-foreground"}`}
              >
                <CircleX className="w-3 h-3" />
                {rejectedCount}
              </button>
              {statusFilter !== "all" && (
                <>
                  <div className="w-px h-3 bg-border" />
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="hover:text-foreground transition-colors"
                  >
                    All
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                onClick={() => setIsFormOpen(true)}
                size="sm"
                className="rounded-full px-4 h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Candidate
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="candidates">
          <div className="flex justify-start mb-4">
            <TabsList>
              <TabsTrigger value="candidates">Candidates</TabsTrigger>
              {isAdmin && <TabsTrigger value="stages">Hiring Stages</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="candidates">
            {/* Main content with sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              {/* Candidate list grouped by stage */}
              <div className="space-y-6 content-start">
                {groupedCandidates.map((group, gIdx) => (
                  <div key={group.stageKey} className="animate-fade-up" style={{ animationDelay: `${gIdx * 100}ms` }}>
                    {/* Stage group header */}
                    <div className="flex items-center gap-3 mb-2 px-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {group.stageLabel}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-[11px] text-muted-foreground/50">
                        {group.candidates.length}
                      </span>
                    </div>

                    {/* Candidate rows */}
                    <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-card/40">
                      {group.candidates.map((candidate, mIdx) => {
                        const isTerminal = isTerminalStage(candidate.currentStage);
                        const needsAssessment = !isTerminal && !candidate.currentStageCompleted;
                        return (
                          <div
                            key={candidate._id}
                            className={`group relative border-l-2 transition-all duration-200 cursor-pointer hover:bg-primary/[0.03] ${
                              needsAssessment ? "border-l-amber-500/40" : isTerminal ? (candidate.currentStage === "hired" ? "border-l-green-500/30" : "border-l-destructive/30") : "border-l-transparent"
                            } ${mIdx > 0 ? "border-t border-border/30" : ""}`}
                            onClick={() => navigate(`/roles/${roleId}/hiring/${candidate._id}`)}
                          >
                            <div className="flex items-center gap-4 px-4 py-3.5">
                              {/* Status dot */}
                              <div className="shrink-0">
                                <span className={`block w-2 h-2 rounded-full ${
                                  isTerminal
                                    ? candidate.currentStage === "hired" ? "bg-green-500" : "bg-destructive"
                                    : candidate.currentStageCompleted ? "bg-green-500" : "bg-muted-foreground/30 animate-pulse"
                                }`} />
                              </div>

                              {/* Name + target role */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {candidate.name}
                                  </span>
                                  <Badge variant="outline" className="text-[11px] h-5 px-1.5 shrink-0">
                                    {candidate.targetRole}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {/* Assessment status inline */}
                                  {!isTerminal && candidate.currentStageCompleted && (
                                    <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Check className="h-3 w-3 text-green-500" />
                                      Assessed
                                      {candidate.currentStageScore != null && (
                                        <span className="text-foreground/70 font-medium ml-0.5">
                                          {candidate.currentStageScore.toFixed(1)}/5
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {needsAssessment && (
                                    <span className="hidden sm:block text-[11px] text-amber-500/70">Needs assessment</span>
                                  )}
                                </div>
                              </div>

                              {/* AI recommendation badges */}
                              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                                {candidate.hiringRecommendation && (
                                  <Badge className={`text-[11px] h-5 px-1.5 ${
                                    candidate.hiringRecommendation.includes("Strong Hire") ? "bg-green-600" :
                                    candidate.hiringRecommendation.includes("Hire") && !candidate.hiringRecommendation.includes("No") ? "bg-green-600/80" :
                                    candidate.hiringRecommendation.includes("Lean Hire") ? "bg-yellow-600" :
                                    candidate.hiringRecommendation.includes("Lean No") ? "bg-orange-600" :
                                    "bg-destructive"
                                  }`}>
                                    {candidate.hiringRecommendation}
                                  </Badge>
                                )}
                                {candidate.teamFitRating && (
                                  <Badge variant="outline" className={`text-[11px] h-5 px-1.5 ${
                                    candidate.teamFitRating.includes("Strong") ? "border-green-500/50 text-green-500" :
                                    candidate.teamFitRating.includes("Good") ? "border-green-500/40 text-green-500/80" :
                                    candidate.teamFitRating.includes("Partial") ? "border-yellow-500/50 text-yellow-500" :
                                    "border-orange-500/50 text-orange-500"
                                  }`}>
                                    {candidate.teamFitRating}
                                  </Badge>
                                )}
                              </div>

                              {/* Actions + chevron */}
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                                          {stageMenuItems.map((stage) => (
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
                                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                              </div>
                            </div>

                            {/* Mobile-only: AI badges + assessment info */}
                            <div className="md:hidden px-4 pb-3 pl-10 flex flex-wrap items-center gap-1.5 text-xs">
                              {candidate.hiringRecommendation && (
                                <Badge className={`text-[11px] h-5 px-1.5 ${
                                  candidate.hiringRecommendation.includes("Strong Hire") ? "bg-green-600" :
                                  candidate.hiringRecommendation.includes("Hire") && !candidate.hiringRecommendation.includes("No") ? "bg-green-600/80" :
                                  candidate.hiringRecommendation.includes("Lean Hire") ? "bg-yellow-600" :
                                  candidate.hiringRecommendation.includes("Lean No") ? "bg-orange-600" :
                                  "bg-destructive"
                                }`}>
                                  {candidate.hiringRecommendation}
                                </Badge>
                              )}
                              {!isTerminal && candidate.currentStageCompleted && (
                                <span className="sm:hidden flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Check className="h-3 w-3 text-green-500" />
                                  {candidate.currentStageScore != null ? `${candidate.currentStageScore.toFixed(1)}/5` : "Assessed"}
                                </span>
                              )}
                              {needsAssessment && (
                                <span className="sm:hidden text-[11px] text-amber-500/70">Needs assessment</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredCandidates.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No {statusFilter !== "all" ? statusFilter : ""} candidates found.
                  </div>
                )}
              </div>

              {/* Right sidebar: Skills to look for */}
              <div className="lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-xl border bg-card p-4">
                  <SkillsRecommendation roleId={roleId} />
                </div>
              </div>
            </div>
          </TabsContent>

          {isAdmin && roleId && (
            <TabsContent value="stages">
              <StagesTab
                roleId={roleId}
                stages={stages || []}
                isAdmin={isAdmin}
              />
            </TabsContent>
          )}
        </Tabs>
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
            levels={levels}
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { MoreVertical, SlidersVertical, Pencil, Trash2, ArrowRight, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HiringCandidate } from "./HiringManagement";

interface CandidateWithStatus extends HiringCandidate {
  currentStageCompleted?: boolean;
  currentStageScore?: number | null;
}

interface CandidateListProps {
  candidates: CandidateWithStatus[];
  loading: boolean;
  isAdmin: boolean;
  onView: (candidate: HiringCandidate) => void;
  onEdit: (candidate: HiringCandidate) => void;
  onDelete: (candidate: HiringCandidate) => void;
  onStageChange: (candidateId: string, newStage: string) => void;
}

const STAGES = [
  { key: "manager_interview", label: "Manager Interview" },
  { key: "portfolio_review", label: "Portfolio Review" },
  { key: "team_interview", label: "Team Interview" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

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

export const CandidateList = ({
  candidates,
  loading,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  onStageChange,
}: CandidateListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start justify-between p-4 rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">
          No candidates yet. {isAdmin && "Add your first candidate above."}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Candidates are assessed through three stages: Manager Interview, Portfolio Review, and Team Interview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {candidates.map((candidate) => (
        <div
          key={candidate._id}
          className="flex items-start justify-between p-4 rounded-lg bg-muted/30 transition-all hover:bg-muted/50"
        >
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold cursor-pointer hover:text-primary truncate"
              onClick={() => onView(candidate)}
            >
              {candidate.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">{candidate.targetRole}</span>
              <Badge variant={getStageBadgeVariant(candidate.currentStage)} className="text-xs">
                {candidate.currentStage.replace(/_/g, " ")}
              </Badge>
              {candidate.currentStage !== "hired" && candidate.currentStage !== "rejected" && (
                candidate.currentStageCompleted ? (
                  <>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Check className="h-3 w-3" />
                      Assessed
                    </Badge>
                    {candidate.currentStageScore != null && (
                      <span className="text-xs text-muted-foreground">
                        {candidate.currentStageScore.toFixed(1)}/5
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground/70">Needs assessment</span>
                )
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-white bg-muted/30 hover:bg-background border border-transparent hover:border-primary"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(candidate)}>
                <SlidersVertical className="h-4 w-4 mr-2" />
                Assessment
              </DropdownMenuItem>

              {isAdmin && (
                <>
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
                          onClick={() => onStageChange(candidate._id, stage.key)}
                        >
                          {stage.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem onClick={() => onEdit(candidate)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => onDelete(candidate)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
};

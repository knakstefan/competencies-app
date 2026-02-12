import { Check, ChevronRight, X } from "lucide-react";
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
import { useState } from "react";

const INTERVIEW_STAGES = [
  { id: "manager_interview", label: "Manager Interview" },
  { id: "portfolio_review", label: "Portfolio Review" },
  { id: "team_interview", label: "Team Interview" },
];

const TERMINAL_STAGES = [
  { id: "hired", label: "Hired" },
  { id: "rejected", label: "Rejected" },
];

const ALL_STAGES = [...INTERVIEW_STAGES, ...TERMINAL_STAGES];

interface StageProgressIndicatorProps {
  currentStage: string;
  isAdmin: boolean;
  onStageChange?: (newStage: string) => Promise<void>;
  stageScores?: Record<string, number>;
}

export const StageProgressIndicator = ({
  currentStage,
  isAdmin,
  onStageChange,
  stageScores = {},
}: StageProgressIndicatorProps) => {
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const isTerminal = currentStage === "hired" || currentStage === "rejected";
  const interviewIndex = INTERVIEW_STAGES.findIndex((s) => s.id === currentStage);

  const handleStageClick = (stageId: string) => {
    if (!isAdmin || !onStageChange || stageId === currentStage) return;
    setPendingStage(stageId);
  };

  const confirmStageChange = async () => {
    if (!pendingStage || !onStageChange) return;
    setIsChanging(true);
    try {
      await onStageChange(pendingStage);
    } finally {
      setIsChanging(false);
      setPendingStage(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
        {INTERVIEW_STAGES.map((stage, index) => {
          const isCompleted = isTerminal || index < interviewIndex;
          const isCurrent = !isTerminal && index === interviewIndex;
          const isPending = stage.id === pendingStage;
          const score = stageScores[stage.id];
          const hasScore = score != null;
          const hasNoAssessment = isCurrent && !hasScore;

          return (
            <div key={stage.id} className="flex items-center gap-2">
              <button
                onClick={() => handleStageClick(stage.id)}
                disabled={!isAdmin || isChanging}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  isCompleted && "bg-primary/10 text-primary",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                  isPending && "ring-2 ring-primary ring-offset-2",
                  hasNoAssessment && "animate-pulse",
                  isAdmin && !isCurrent && "hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 cursor-pointer",
                  !isAdmin && "cursor-default"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4 flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{stage.label}</span>
                <span className="sm:hidden">{stage.label.split(" ")[0]}</span>
                {hasScore && (
                  <span className={cn(
                    "ml-1 text-xs font-semibold",
                    isCompleted && "text-primary/70",
                    isCurrent && "text-primary-foreground/80"
                  )}>
                    {score.toFixed(1)}
                  </span>
                )}
              </button>

              {index < INTERVIEW_STAGES.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}

        {isTerminal && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => handleStageClick(currentStage === "hired" ? "rejected" : "hired")}
              disabled={!isAdmin || isChanging}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                currentStage === "hired" && "bg-green-600 text-white",
                currentStage === "rejected" && "bg-destructive text-destructive-foreground",
                isAdmin && "hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 cursor-pointer",
                !isAdmin && "cursor-default"
              )}
            >
              {currentStage === "hired" ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {currentStage === "hired" ? "Hired" : "Rejected"}
              </span>
              <span className="sm:hidden">
                {currentStage === "hired" ? "Hired" : "Rejected"}
              </span>
            </button>
          </>
        )}
      </div>

      <AlertDialog open={!!pendingStage} onOpenChange={() => setPendingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Candidate Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this candidate to{" "}
              <strong>
                {ALL_STAGES.find((s) => s.id === pendingStage)?.label}
              </strong>
              ? This will update their position in the hiring pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChanging}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStageChange} disabled={isChanging}>
              {isChanging ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

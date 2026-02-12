import { Check, ChevronRight } from "lucide-react";
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

const STAGES = [
  { id: "manager_interview", label: "Manager Interview" },
  { id: "portfolio_review", label: "Portfolio Review" },
  { id: "team_interview", label: "Team Interview" },
];

interface StageProgressIndicatorProps {
  currentStage: string;
  isAdmin: boolean;
  onStageChange?: (newStage: string) => Promise<void>;
}

export const StageProgressIndicator = ({
  currentStage,
  isAdmin,
  onStageChange,
}: StageProgressIndicatorProps) => {
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

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
      <div className="flex items-center justify-center gap-2 py-4">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = stage.id === pendingStage;

          return (
            <div key={stage.id} className="flex items-center gap-2">
              <button
                onClick={() => handleStageClick(stage.id)}
                disabled={!isAdmin || isChanging}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  isCompleted && "bg-primary/10 text-primary",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                  isPending && "ring-2 ring-primary ring-offset-2",
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
              </button>

              {index < STAGES.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!pendingStage} onOpenChange={() => setPendingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Candidate Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this candidate to{" "}
              <strong>
                {STAGES.find((s) => s.id === pendingStage)?.label}
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

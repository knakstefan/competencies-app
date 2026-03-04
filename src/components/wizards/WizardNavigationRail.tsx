import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { RATING_DOT_COLORS } from "@/lib/ratingConstants";
import { ClipboardCheck } from "lucide-react";

interface WizardNavigationRailProps {
  categories: string[];
  questions: { category: string; stepIndex?: number; subId?: string }[];
  responses: Record<number, { rating: string | null; notes?: string | null }>;
  currentStep: number;
  activeSubId?: string | null;
  onNavigate: (step: number, subId?: string) => void;
  isSummaryStep: boolean;
}

interface CategoryGroup {
  label: string;
  stepIndex: number;
  dots: { questionIdx: number; rating: string | null; subId?: string }[];
}

export function WizardNavigationRail({
  categories,
  questions,
  responses,
  currentStep,
  activeSubId,
  onNavigate,
  isSummaryStep,
}: WizardNavigationRailProps) {
  const ratedCount = Object.values(responses).filter((r) => r.rating).length;

  const categoryGroups = useMemo(() => {
    const groups: CategoryGroup[] = [];
    let currentGroup: CategoryGroup | null = null;

    questions.forEach((q, idx) => {
      const stepIdx = q.stepIndex ?? idx;
      if (!currentGroup || currentGroup.label !== q.category) {
        currentGroup = { label: q.category, stepIndex: stepIdx, dots: [] };
        groups.push(currentGroup);
      }
      currentGroup.dots.push({
        questionIdx: idx,
        rating: responses[idx]?.rating ?? null,
        subId: q.subId,
      });
    });

    return groups;
  }, [questions, responses]);

  return (
    <div className="space-y-2">
      {/* Completion text */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-muted-foreground">
          {ratedCount} of {questions.length} rated
        </span>
      </div>

      {/* Dot navigation — dots grouped by competency */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 px-1">
        {categoryGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 truncate max-w-[100px]">
              {group.label}
            </span>
            <div className="flex items-center gap-1">
              {group.dots.map((dot) => {
                const isCurrent = !isSummaryStep && (
                  activeSubId != null
                    ? dot.subId === activeSubId
                    : group.stepIndex === currentStep
                );
                const dotColor = dot.rating
                  ? (RATING_DOT_COLORS[dot.rating] ?? "bg-muted-foreground/25")
                  : "bg-muted-foreground/25";

                return (
                  <button
                    key={dot.questionIdx}
                    onClick={() => onNavigate(group.stepIndex, dot.subId)}
                    className={cn(
                      "h-3.5 w-3.5 rounded-full transition-all duration-150 hover:scale-125",
                      isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      dotColor,
                    )}
                    title={`${group.label}${dot.rating ? ` (${dot.rating.replace("_", " ")})` : ""}`}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Summary dot */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            Review
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate(categories.length)}
              className={cn(
                "h-3.5 w-3.5 rounded-full transition-all duration-150 hover:scale-125 flex items-center justify-center",
                isSummaryStep && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                ratedCount === questions.length ? "bg-primary" : "bg-muted-foreground/25",
              )}
              title="Review & Complete"
            >
              <ClipboardCheck className="h-2 w-2 text-transparent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

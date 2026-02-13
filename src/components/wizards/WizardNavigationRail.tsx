import { cn } from "@/lib/utils";
import { RATING_DOT_COLORS } from "@/lib/ratingConstants";
import { ClipboardCheck } from "lucide-react";

interface WizardNavigationRailProps {
  categories: string[];
  questions: { category: string }[];
  responses: Record<number, { rating: string | null; notes?: string | null }>;
  currentStep: number;
  onNavigate: (step: number) => void;
  isSummaryStep: boolean;
}

export function WizardNavigationRail({
  categories,
  questions,
  responses,
  currentStep,
  onNavigate,
  isSummaryStep,
}: WizardNavigationRailProps) {
  const ratedCount = Object.values(responses).filter((r) => r.rating).length;
  const currentCategory = isSummaryStep
    ? "Summary"
    : questions[currentStep]?.category ?? "";

  // Build category groups with their question indices
  const categoryGroups = categories.map((cat) => {
    const indices: number[] = [];
    questions.forEach((q, i) => {
      if (q.category === cat) indices.push(i);
    });
    return { category: cat, indices };
  });

  return (
    <div className="space-y-2">
      {/* Completion text */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-muted-foreground">
          {ratedCount} of {questions.length} rated
        </span>
        <span className="text-xs font-medium text-foreground/70 truncate max-w-[200px]">
          {currentCategory}
        </span>
      </div>

      {/* Dot navigation */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 px-1">
        {categoryGroups.map((group) => (
          <div key={group.category} className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 truncate">
              {group.category.split(" ")[0]}
            </span>
            <div className="flex items-center gap-1">
              {group.indices.map((idx) => {
                const resp = responses[idx];
                const rating = resp?.rating;
                const isCurrent = !isSummaryStep && currentStep === idx;
                const dotColor = rating ? (RATING_DOT_COLORS[rating] ?? "bg-muted-foreground/25") : "bg-muted-foreground/25";

                return (
                  <button
                    key={idx}
                    onClick={() => onNavigate(idx)}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all duration-150 hover:scale-125",
                      isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      dotColor,
                    )}
                    title={`Question ${idx + 1}${rating ? ` (${rating.replace("_", " ")})` : ""}`}
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
              onClick={() => onNavigate(questions.length)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-150 hover:scale-125 flex items-center justify-center",
                isSummaryStep && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                ratedCount === questions.length ? "bg-primary" : "bg-muted-foreground/25",
              )}
              title="Review & Complete"
            >
              <ClipboardCheck className="h-1.5 w-1.5 text-transparent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

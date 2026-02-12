import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { RATING_OPTIONS, RATING_SCORE_MAP } from "@/lib/ratingConstants";

interface WizardSummaryProps {
  categories: string[];
  questions: { category: string; label: string }[];
  responses: Record<number, { rating: string | null; notes?: string | null }>;
  onNavigate: (step: number) => void;
  overallImpression: string;
  onOverallImpressionChange: (value: string) => void;
}

export function WizardSummary({
  categories,
  questions,
  responses,
  onNavigate,
  overallImpression,
  onOverallImpressionChange,
}: WizardSummaryProps) {
  const totalQuestions = questions.length;
  const ratedCount = Object.values(responses).filter((r) => r.rating).length;
  const coveragePct = totalQuestions > 0 ? (ratedCount / totalQuestions) * 100 : 0;

  // Rating distribution
  const distribution: Record<string, number> = {};
  let totalScore = 0;
  let scored = 0;
  for (const r of Object.values(responses)) {
    if (r.rating) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      totalScore += RATING_SCORE_MAP[r.rating] ?? 0;
      scored++;
    }
  }
  const averageScore = scored > 0 ? totalScore / scored : 0;

  // Distribution bar colors matching RATING_OPTIONS order
  const distColors: Record<string, string> = {
    well_below: "bg-red-500",
    below: "bg-orange-500",
    target: "bg-zinc-400",
    above: "bg-green-500",
    well_above: "bg-emerald-500",
  };

  // Per-category breakdown
  const categoryGroups = categories.map((cat) => {
    const indices: number[] = [];
    questions.forEach((q, i) => {
      if (q.category === cat) indices.push(i);
    });
    const catRated = indices.filter((i) => responses[i]?.rating).length;
    let catTotal = 0;
    let catCount = 0;
    indices.forEach((i) => {
      const r = responses[i];
      if (r?.rating && RATING_SCORE_MAP[r.rating]) {
        catTotal += RATING_SCORE_MAP[r.rating];
        catCount++;
      }
    });
    const catAvg = catCount > 0 ? catTotal / catCount : 0;
    return { category: cat, indices, rated: catRated, total: indices.length, avg: catAvg };
  });

  return (
    <div className="space-y-6">
      {/* Coverage bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {ratedCount} of {totalQuestions} rated
          </span>
          {coveragePct < 80 && (
            <span className="flex items-center gap-1 text-amber-400 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              Incomplete
            </span>
          )}
        </div>
        <Progress value={coveragePct} />
      </div>

      {/* Rating distribution bar */}
      {scored > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rating distribution</span>
            <span className="font-medium">
              Avg: {averageScore.toFixed(1)}
            </span>
          </div>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
            {RATING_OPTIONS.map((opt) => {
              const count = distribution[opt.value] || 0;
              if (count === 0) return null;
              const pct = (count / scored) * 100;
              return (
                <div
                  key={opt.value}
                  className={`${distColors[opt.value]} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                  title={`${opt.label}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {RATING_OPTIONS.map((opt) => {
              const count = distribution[opt.value] || 0;
              if (count === 0) return null;
              return (
                <span key={opt.value} className="flex items-center gap-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${distColors[opt.value]}`} />
                  {opt.label}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-category breakdown */}
      <div className="space-y-3">
        {categoryGroups.map((group) => (
          <div
            key={group.category}
            className="rounded-lg border border-border/50 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.category}
              </span>
              {group.rated > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {group.avg.toFixed(1)} avg
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              {group.indices.map((idx) => {
                const resp = responses[idx];
                const isRated = !!resp?.rating;
                const ratingLabel = isRated
                  ? RATING_OPTIONS.find((o) => o.value === resp.rating)?.label
                  : null;

                return (
                  <button
                    key={idx}
                    onClick={() => onNavigate(idx)}
                    className="flex items-center justify-between gap-2 text-sm py-0.5 w-full text-left rounded hover:bg-muted/50 px-1 -mx-1 transition-colors"
                  >
                    <span className="truncate text-muted-foreground flex-1 min-w-0">
                      {questions[idx].label}
                    </span>
                    {isRated ? (
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0"
                      >
                        {ratingLabel}
                      </Badge>
                    ) : (
                      <span className="text-xs text-primary shrink-0">
                        Rate
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Overall impression */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Overall Impression</label>
        <Textarea
          placeholder="Summarize your overall impression of the candidate..."
          value={overallImpression}
          onChange={(e) => onOverallImpressionChange(e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );
}

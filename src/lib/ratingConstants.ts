export interface RatingOption {
  value: string;
  label: string;
  hint: string;
  colorClass: string;
  dotColor: string;
  score: number;
}

export const RATING_OPTIONS: RatingOption[] = [
  {
    value: "well_below",
    label: "Well Below",
    hint: "Significant gaps, substantial development needed",
    colorClass: "data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400",
    dotColor: "bg-red-500",
    score: 1,
  },
  {
    value: "below",
    label: "Below",
    hint: "Partially meets expectations, development needed",
    colorClass: "data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400",
    dotColor: "bg-orange-500",
    score: 2,
  },
  {
    value: "target",
    label: "At Target",
    hint: "Meets expectations for the target level",
    colorClass: "data-[state=active]:bg-zinc-400/20 data-[state=active]:text-zinc-300",
    dotColor: "bg-blue-500",
    score: 3,
  },
  {
    value: "above",
    label: "Above",
    hint: "Consistently strong, exceeds most expectations",
    colorClass: "data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400",
    dotColor: "bg-green-500",
    score: 4,
  },
  {
    value: "well_above",
    label: "Well Above",
    hint: "Exceptional, exceeds all expectations for this level",
    colorClass: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400",
    dotColor: "bg-emerald-500",
    score: 5,
  },
];

export const RATING_DOT_COLORS: Record<string, string> = Object.fromEntries(
  RATING_OPTIONS.map((o) => [o.value, o.dotColor])
);

export const RATING_SCORE_MAP: Record<string, number> = Object.fromEntries(
  RATING_OPTIONS.map((o) => [o.value, o.score])
);

export function ratingToScore(rating: string | null | undefined): number | null {
  if (!rating) return null;
  return RATING_SCORE_MAP[rating] ?? null;
}

export function getRatingOption(value: string): RatingOption | undefined {
  return RATING_OPTIONS.find((o) => o.value === value);
}

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users } from "lucide-react";

interface CandidateAssessmentSidebarProps {
  candidateId: string;
}

export const CandidateAssessmentSidebar = ({ candidateId }: CandidateAssessmentSidebarProps) => {
  const assessments = useQuery(api.candidateAssessments.listForCandidate, {
    candidateId: candidateId as Id<"hiringCandidates">,
  });

  if (!assessments) return null;

  // Get all completed assessments with summaries
  const completedWithSummary = assessments
    .filter((a: any) => a.status === "completed" && a.generatedSummary)
    .sort((a: any, b: any) => (b.completedAt || "").localeCompare(a.completedAt || ""));

  if (completedWithSummary.length === 0) return null;

  // Use the latest assessment's summary as the primary
  const latest = completedWithSummary[0] as any;
  const summary = latest.generatedSummary;

  const getRecommendationColor = (rec: string) => {
    if (rec.includes("Strong Hire")) return "bg-green-600";
    if (rec.includes("Hire") && !rec.includes("No")) return "bg-green-600/80";
    if (rec.includes("Lean Hire")) return "bg-yellow-600";
    if (rec.includes("Lean No")) return "bg-orange-600";
    return "bg-destructive";
  };

  const getTeamFitColor = (rating: string) => {
    if (rating.includes("Strong")) return "bg-green-600";
    if (rating.includes("Good")) return "bg-green-600/80";
    if (rating.includes("Partial")) return "bg-yellow-600";
    return "bg-orange-600";
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Assessment</h3>
      </div>

      {/* Hiring Recommendation — prominent */}
      {summary.hiringRecommendation && (
        <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 border border-border/50">
          <span className="text-xs font-medium text-muted-foreground">Recommendation</span>
          <Badge className={`text-xs ${getRecommendationColor(summary.hiringRecommendation)}`}>
            {summary.hiringRecommendation}
          </Badge>
        </div>
      )}

      {/* Team Fit */}
      {summary.teamFit && (
        <div className="py-2 px-3 rounded-md bg-primary/5 border border-primary/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">Team Fit</span>
            </div>
            {summary.teamFitRating && (
              <Badge className={`text-[10px] h-5 px-1.5 ${getTeamFitColor(summary.teamFitRating)}`}>
                {summary.teamFitRating}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{summary.teamFit}</p>
        </div>
      )}

    </div>
  );
};

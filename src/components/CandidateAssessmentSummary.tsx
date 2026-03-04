import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

interface CandidateAISummary {
  overallNarrative: string;
  strengths: Array<{ area: string; detail: string }>;
  concerns: Array<{
    area: string;
    question: string;
    rating: string;
    observation: string;
  }>;
  hiringRecommendation: string;
}

interface CandidateAssessmentSummaryProps {
  aiSummary?: CandidateAISummary | null;
  aiSummaryLoading?: boolean;
}

export const CandidateAssessmentSummary = ({
  aiSummary,
  aiSummaryLoading,
}: CandidateAssessmentSummaryProps) => {
  if (!aiSummary && !aiSummaryLoading) return null;

  const getRatingBadge = (rating: string) => {
    const isWellBelow = rating.toLowerCase().includes("well below");
    return (
      <Badge variant="destructive" className={`text-xs ${isWellBelow ? "bg-red-600" : "bg-orange-600"}`}>
        {rating}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {aiSummaryLoading && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Generating AI assessment summary...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {aiSummary && !aiSummaryLoading && (
        <>
          {/* Overall Narrative */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">AI Assessment Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiSummary.overallNarrative}
            </p>
          </div>

          {/* Strengths */}
          {aiSummary.strengths.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Strengths</h3>
              <div className="space-y-2">
                {aiSummary.strengths.map((strength, idx) => (
                  <div key={idx} className="py-2 px-3 rounded-md bg-green-500/5 border border-green-500/10">
                    <p className="text-sm font-medium text-green-400">{strength.area}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{strength.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {aiSummary.concerns.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Concerns</h3>
              <div className="space-y-3">
                {aiSummary.concerns.map((concern, idx) => (
                  <div key={idx} className="py-3 px-3 rounded-md bg-orange-500/5 border border-orange-500/10 space-y-2">
                    <div className="flex items-start gap-2">
                      {getRatingBadge(concern.rating)}
                      <span className="text-sm font-medium">{concern.area}</span>
                    </div>
                    <p className="text-sm">{concern.question}</p>
                    <p className="text-sm text-muted-foreground">{concern.observation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hiring Recommendation */}
          {aiSummary.hiringRecommendation && (
            <div className="py-2 px-3 rounded-md bg-muted/30 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Hiring Recommendation</p>
              <p className="text-sm">{aiSummary.hiringRecommendation}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

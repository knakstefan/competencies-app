import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubCompetency as SubCompetencyType, CriteriaEvaluation } from "@/types/competency";

interface Competency {
  _id: string;
  title: string;
  code: string;
  orderIndex: number;
  description?: string | null;
}

interface Progress {
  _id?: string;
  subCompetencyId: string;
  currentLevel: string;
  notes: string;
  evaluations?: CriteriaEvaluation[];
}

interface AssessmentDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  competency: Competency;
  subCompetencies: SubCompetencyType[];
  progress: Record<string, Progress>;
}

export const AssessmentDetailsDialog = ({
  open,
  onClose,
  competency,
  subCompetencies,
  progress,
}: AssessmentDetailsDialogProps) => {
  const getAssessmentSummary = (evaluations: CriteriaEvaluation[] = []) => {
    const below = evaluations.filter(e => e.evaluation === 'below');
    const target = evaluations.filter(e => e.evaluation === 'target');
    const above = evaluations.filter(e => e.evaluation === 'above');
    const total = evaluations.length;

    if (total === 0) return null;

    const abovePercent = above.length / total;
    const belowPercent = below.length / total;

    let trend: 'level-up' | 'needs-support' | 'on-track' = 'on-track';
    let recommendation = '';

    if (abovePercent > 0.5) {
      trend = 'level-up';
      const strengths = above.map(e => e.criterionText.toLowerCase()).slice(0, 2);
      recommendation = `Excelling in areas like ${strengths.join(' and ')}. Ready to take on more complex projects and mentor others in these competencies. Consider stretch assignments that leverage these strengths.`;
    } else if (belowPercent > 0.5) {
      trend = 'needs-support';
      const gaps = below.map(e => e.criterionText.toLowerCase()).slice(0, 2);
      recommendation = `Requires focused development in ${gaps.join(' and ')}. Recommend pairing with experienced team members, structured learning opportunities, and setting specific measurable goals with regular feedback sessions.`;
    } else {
      if (above.length > 0) {
        const strengths = above.map(e => e.criterionText.toLowerCase()).slice(0, 2);
        recommendation = `Performing well overall with notable strengths in ${strengths.join(' and ')}. Continue building on these areas while maintaining solid performance across other competencies.`;
      } else {
        recommendation = 'Meeting expectations across all assessed criteria. Continue current trajectory and identify areas for future growth.';
      }
    }

    return { 
      below: below.map(e => e.criterionText), 
      target: target.map(e => e.criterionText), 
      above: above.map(e => e.criterionText), 
      total, 
      trend,
      recommendation 
    };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{competency.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {subCompetencies.map((sub) => {
            const subProgress = progress[sub._id];
            const summary = subProgress ? getAssessmentSummary(subProgress.evaluations) : null;

            return (
              <div key={sub._id} className="p-5 rounded-lg bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium">{sub.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {subProgress && summary ? (
                      <>
                        {summary.trend === 'level-up' && (
                          <Badge variant="default" className="bg-green-600">
                            Trending towards next level
                          </Badge>
                        )}
                        {summary.trend === 'needs-support' && (
                          <Badge variant="destructive">
                            Needs support
                          </Badge>
                        )}
                        {summary.trend === 'on-track' && (
                          <Badge variant="secondary">
                            On Track
                          </Badge>
                        )}
                      </>
                    ) : (
                      !subProgress && <span className="text-sm text-muted-foreground">Not assessed</span>
                    )}
                  </div>
                </div>

                {summary && (
                  <div className="mt-3 p-4 bg-muted/50 rounded-md space-y-3">
                    {summary.below.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-destructive">
                          Below Target:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          {summary.below.map((criterion, idx) => (
                            <li key={idx}>{criterion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.above.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-600">
                          Above Target:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          {summary.above.map((criterion, idx) => (
                            <li key={idx}>{criterion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.target.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          At Target:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          {summary.target.map((criterion, idx) => (
                            <li key={idx}>{criterion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      {summary.trend === 'level-up' && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-green-600 font-medium">↗</span>
                          <div>
                            <p className="font-medium text-green-600 mb-1">Trending towards next level</p>
                            <p className="text-muted-foreground">{summary.recommendation}</p>
                          </div>
                        </div>
                      )}
                      {summary.trend === 'needs-support' && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-destructive font-medium">⚠</span>
                          <div>
                            <p className="font-medium text-destructive mb-1">Needs support to meet target</p>
                            <p className="text-muted-foreground">{summary.recommendation}</p>
                          </div>
                        </div>
                      )}
                      {summary.trend === 'on-track' && (
                        <div className="flex gap-2 text-sm">
                          <span className="font-medium">✓</span>
                          <div>
                            <p className="font-medium mb-1">On Track</p>
                            <p className="text-muted-foreground">{summary.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subProgress?.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {subProgress.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

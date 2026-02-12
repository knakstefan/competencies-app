import { Competency, SubCompetency } from "@/types/competency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssessmentSummaryProps {
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  assessmentData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }>;
}

export const AssessmentSummary = ({
  competencies,
  subCompetencies,
  assessmentData,
}: AssessmentSummaryProps) => {
  // Helper function to rephrase criteria as improvement areas
  const rephraseAsImprovement = (criterion: string): string => {
    // Convert positive capability statements to improvement needs
    const lowerCriterion = criterion.toLowerCase();
    
    // Check for common patterns and rephrase accordingly
    if (lowerCriterion.startsWith("understands") || lowerCriterion.startsWith("demonstrates understanding")) {
      return criterion.replace(/^(Understands|Demonstrates understanding of)/i, "Develop understanding of");
    }
    if (lowerCriterion.startsWith("can ") || lowerCriterion.startsWith("able to")) {
      return criterion.replace(/^(Can|Able to)/i, "Improve ability to");
    }
    if (lowerCriterion.startsWith("writes") || lowerCriterion.startsWith("creates") || lowerCriterion.startsWith("develops")) {
      return criterion.replace(/^(Writes|Creates|Develops)/i, "Improve");
    }
    if (lowerCriterion.startsWith("effectively") || lowerCriterion.startsWith("proficiently")) {
      return criterion.replace(/^(Effectively|Proficiently)/i, "Improve");
    }
    if (lowerCriterion.includes("consistently")) {
      return criterion.replace(/consistently/i, "more consistently");
    }
    
    // Default: return as-is (will be in a list context)
    return criterion;
  };

  // Helper to convert evaluation to numeric score (5-point scale)
  const evaluationToScore = (evaluation: string): number => {
    switch (evaluation) {
      case "well_above": return 5;
      case "above": return 4;
      case "target": return 3;
      case "below": return 2;
      case "well_below": return 1;
      default: return 3;
    }
  };

  // Calculate overall performance summary with focus areas
  const getOverallSummary = () => {
    const belowCriteria: string[] = [];
    const targetCriteria: string[] = [];
    const aboveCriteria: string[] = [];
    let totalEvaluations = 0;
    let totalScore = 0;

    Object.values(assessmentData).forEach((data) => {
      if (data.evaluations) {
        Object.entries(data.evaluations).forEach(([criterion, evaluation]) => {
          totalEvaluations++;
          const score = evaluationToScore(evaluation);
          totalScore += score;
          
          if (evaluation === "below" || evaluation === "well_below") {
            belowCriteria.push(rephraseAsImprovement(criterion));
          } else if (evaluation === "above" || evaluation === "well_above") {
            aboveCriteria.push(criterion);
          } else {
            targetCriteria.push(criterion);
          }
        });
      }
    });

    if (totalEvaluations === 0) {
      return { 
        trend: "on-track", 
        performance: "No evaluations yet",
        supports: null
      };
    }

    const averageScore = totalScore / totalEvaluations;
    const belowPercent = (belowCriteria.length / totalEvaluations) * 100;
    const abovePercent = (aboveCriteria.length / totalEvaluations) * 100;
    const targetPercent = (targetCriteria.length / totalEvaluations) * 100;

    let trend: string;
    let performance: string;

    // Use average score for more nuanced assessment
    if (averageScore >= 4.0) {
      trend = "level-up";
      performance = `Strong performance with average score of ${averageScore.toFixed(1)}/5 - ${Math.round(abovePercent)}% of criteria exceeding expectations`;
    } else if (averageScore < 2.5) {
      trend = "needs-support";
      performance = `${Math.round(belowPercent)}% of criteria below target (avg: ${averageScore.toFixed(1)}/5), requiring focused development`;
    } else {
      trend = "on-track";
      performance = `Balanced performance (avg: ${averageScore.toFixed(1)}/5) with ${Math.round(targetPercent)}% meeting expectations`;
    }

    const supports = belowCriteria.length > 0
      ? belowCriteria.slice(0, 3).join("; ") + (belowCriteria.length > 3 ? `; +${belowCriteria.length - 3} more areas` : "")
      : null;

    return { trend, performance, supports };
  };

  const overallSummary = getOverallSummary();

  const getTrendVariant = (trend: string) => {
    if (trend === "level-up") return "default";
    if (trend === "needs-support") return "destructive";
    return "secondary";
  };

  const getTrendLabel = (trend: string) => {
    if (trend === "level-up") return "Progressing";
    if (trend === "needs-support") return "Needs Support";
    return "On Track";
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant={getTrendVariant(overallSummary.trend)} className="mb-2">
                {getTrendLabel(overallSummary.trend)}
              </Badge>
              <div className="text-lg font-medium">{overallSummary.performance}</div>
            </div>
            
            {overallSummary.supports && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-2">Support Needed:</h4>
                <p className="text-sm text-muted-foreground">{overallSummary.supports}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TooltipProvider>
        <div className="space-y-4">
          <h3 className="font-semibold">Assessment Overview</h3>
        {competencies.map((comp) => {
          const compSubCompetencies = subCompetencies.filter(
            (sc) => sc.competencyId === comp._id
          );
          
          // Calculate performance summary for this competency
          const belowCriteria: string[] = [];
          const aboveCriteria: string[] = [];
          let totalEvals = 0;
          
          compSubCompetencies.forEach((sc) => {
            const data = assessmentData[sc._id];
            if (data?.evaluations) {
              Object.entries(data.evaluations).forEach(([criterion, evaluation]) => {
                totalEvals++;
                if (evaluation === "below" || evaluation === "well_below") {
                  belowCriteria.push(rephraseAsImprovement(criterion));
                } else if (evaluation === "above" || evaluation === "well_above") {
                  aboveCriteria.push(criterion);
                }
              });
            }
          });

          const getSummary = () => {
            if (totalEvals === 0) {
              return { trend: "on-track", text: "Not yet assessed", tooltip: null };
            }
            
          if (belowCriteria.length > 0) {
            const fullText = belowCriteria.join("; ");
            return {
              trend: "needs-support",
              text: "Needs Support",
              tooltip: fullText
            };
          }
          
          if (aboveCriteria.length > totalEvals * 0.5) {
            return { trend: "level-up", text: "Progressing", tooltip: null };
          }
          
          return { trend: "on-track", text: "On Track", tooltip: null };
          };

          const summary = getSummary();

          return (
            <Card key={comp._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{comp.title}</CardTitle>
                  {summary.tooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Badge variant={getTrendVariant(summary.trend)} className="cursor-help">
                            {summary.text}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md z-[100]">
                        <ul className="list-disc pl-4 space-y-1">
                          {summary.tooltip.split("; ").map((item, idx) => (
                            <li key={idx} className="text-xs">{item}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge variant={getTrendVariant(summary.trend)}>
                      {summary.text}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {compSubCompetencies.map((subComp) => {
                    const data = assessmentData[subComp._id];
                    
                    // Calculate performance summary for this sub-competency
                    const getSubCompSummary = () => {
                      if (!data?.evaluations) {
                        return { variant: "secondary" as const, text: "Not assessed", tooltip: null };
                      }
                      
                      const belowCriteria: string[] = [];
                      const aboveCriteria: string[] = [];
                      
                      Object.entries(data.evaluations).forEach(([criterion, evaluation]) => {
                        if (evaluation === "below" || evaluation === "well_below") {
                          belowCriteria.push(rephraseAsImprovement(criterion));
                        } else if (evaluation === "above" || evaluation === "well_above") {
                          aboveCriteria.push(criterion);
                        }
                      });
                      
                      if (belowCriteria.length > 0) {
                        const fullText = belowCriteria.join("; ");
                        return {
                          variant: "destructive" as const,
                          text: "Needs Support",
                          tooltip: fullText
                        };
                      }
                      
                      if (aboveCriteria.length > Object.keys(data.evaluations).length * 0.5) {
                        return { variant: "default" as const, text: "Progressing", tooltip: null };
                      }
                      
                      return { variant: "secondary" as const, text: "On Track", tooltip: null };
                    };
                    
                    const subSummary = getSubCompSummary();
                    
                    return (
                      <div key={subComp._id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {data ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{subComp.title}</span>
                        </div>
                        {subSummary.tooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge variant={subSummary.variant} className="text-xs cursor-help">
                                  {subSummary.text}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md z-[100]">
                              <ul className="list-disc pl-4 space-y-1">
                                {subSummary.tooltip.split("; ").map((item, idx) => (
                                  <li key={idx} className="text-xs">{item}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant={subSummary.variant} className="text-xs">
                            {subSummary.text}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </TooltipProvider>
    </div>
  );
};

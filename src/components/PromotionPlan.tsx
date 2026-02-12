import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, TrendingUp, Target, BookOpen, Calendar, CheckCircle2, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TeamMember {
  _id: string;
  name: string;
  role: string;
}

interface PromotionPlanProps {
  member: TeamMember;
  isAdmin: boolean;
  roleId?: string;
}

interface PlanContent {
  summary: string;
  trendingAnalysis?: {
    hasMultipleAssessments: boolean;
    assessmentCount: number;
    overallTrend: string;
    competencyTrends: Array<{
      competency: string;
      trend: string;
      change: number;
      insight: string;
    }>;
    trendSummary: string;
  };
  strengths?: Array<{
    title: string;
    description: string;
  }>;
  developmentAreas?: Array<{
    title: string;
    gap: string;
    actions: string[];
    timeline: string;
  }>;
  resources?: Array<{
    area: string;
    items: Array<{
      name: string;
      description: string;
      link?: string;
    }>;
  }>;
  milestones?: Array<{
    title: string;
    description: string;
  }>;
  timeline: string;
  fullPlan?: string;
}

interface PromotionPlanData {
  _id: string;
  memberCurrentRole: string;
  targetLevel: string;
  generatedAt: string;
  planContent: PlanContent;
}

export const PromotionPlan = ({ member, isAdmin, roleId }: PromotionPlanProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Convex reactive query - returns undefined while loading, null if no plan
  const plan = useQuery(api.promotionPlans.getLatestForMember, { memberId: member._id }) as PromotionPlanData | null | undefined;

  // Convex action for AI generation
  const generatePlanAction = useAction(api.ai.generatePromotionPlan);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      await generatePlanAction({
        memberId: member._id,
        ...(roleId ? { roleId: roleId as any } : {}),
      });

      toast({
        title: "Success",
        description: "Promotion plan generated successfully!",
      });
    } catch (error: any) {
      console.error("Error generating promotion plan:", error);
      const message = error?.message || "";
      if (message.includes("429")) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please try again in a moment.",
          variant: "destructive",
        });
      } else if (message.includes("402")) {
        toast({
          title: "Credits Required",
          description: "AI credits depleted. Please add credits to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate promotion plan. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // Loading state: query hasn't resolved yet
  if (plan === undefined) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No plan exists yet
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Progression Plan
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">AI-powered development plan for {member.name}</p>
            </div>
            {isAdmin && (
              <Button onClick={handleGeneratePlan} disabled={generating}>
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No progression plan has been generated yet.
              {isAdmin
                ? " Click 'Generate Plan' to create a personalized development plan based on their competency assessments."
                : " Ask your administrator to generate a promotion plan for you."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { planContent } = plan;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Generated Plan</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                Personal Development Plan
              </h1>
              <p className="text-lg text-muted-foreground">Personalized roadmap for {member.name}</p>
            </div>
            {isAdmin && (
              <Button onClick={handleGeneratePlan} disabled={generating} size="lg" variant="outline" className="shadow-md">
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
              <Badge variant="secondary" className="text-base px-3 py-1 capitalize">
                {plan.memberCurrentRole}
              </Badge>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <Badge variant="default" className="text-base px-3 py-1 bg-primary capitalize">
                {plan.targetLevel}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Updated{" "}
              {new Date(plan.generatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section with Trends */}
      {planContent.summary && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Executive Summary</h2>
            {planContent.trendingAnalysis?.hasMultipleAssessments && (
              <Badge variant="secondary" className="ml-auto">
                {planContent.trendingAnalysis.assessmentCount} Assessments Analyzed
              </Badge>
            )}
          </div>
          <Card className="border-primary/20 shadow-md">
            <CardContent className="pt-6 space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">{planContent.summary}</p>

              {/* Integrated Trend Analysis */}
              {planContent.trendingAnalysis?.hasMultipleAssessments && (
                <div className="space-y-4 pt-4 border-t border-border">
                  {/* Overall Trend Banner */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`p-2 rounded-full ${
                      planContent.trendingAnalysis.overallTrend === 'improving'
                        ? 'bg-green-500/20'
                        : planContent.trendingAnalysis.overallTrend === 'declining'
                          ? 'bg-red-500/20'
                          : 'bg-muted'
                    }`}>
                      <TrendingUp className={`w-5 h-5 ${
                        planContent.trendingAnalysis.overallTrend === 'improving'
                          ? 'text-green-600'
                          : planContent.trendingAnalysis.overallTrend === 'declining'
                            ? 'text-red-600 rotate-180'
                            : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium capitalize">{planContent.trendingAnalysis.overallTrend} Overall Trajectory</p>
                      <p className="text-sm text-muted-foreground">{planContent.trendingAnalysis.trendSummary}</p>
                    </div>
                  </div>

                  {/* Competency Trend Pills */}
                  {planContent.trendingAnalysis.competencyTrends && planContent.trendingAnalysis.competencyTrends.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Competency Trends</p>
                      <div className="flex flex-wrap gap-2">
                        {planContent.trendingAnalysis.competencyTrends.map((trend, idx) => (
                          <div
                            key={idx}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                              trend.trend === 'improving'
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : trend.trend === 'declining'
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                            title={trend.insight}
                          >
                            {trend.trend === 'improving' && <TrendingUp className="w-3.5 h-3.5" />}
                            {trend.trend === 'declining' && <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
                            {trend.trend === 'stable' && <span className="w-3.5 h-0.5 bg-current rounded" />}
                            <span className="font-medium">{trend.competency}</span>
                            <span className="text-xs opacity-75 capitalize">({trend.trend})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Strengths Section */}
      {planContent.strengths && Array.isArray(planContent.strengths) && planContent.strengths.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Key Strengths</h2>
          </div>
          <div className="grid gap-4">
            {planContent.strengths.map((strength, index) => (
              <Collapsible key={index}>
                <Card className="border-green-500/20 shadow-md overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="hover:bg-green-500/5 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-left flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {strength.title}
                        </CardTitle>
                        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-6">
                      <p className="text-muted-foreground leading-relaxed">{strength.description}</p>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </section>
      )}

      {/* Development Areas Section */}
      {planContent.developmentAreas &&
        Array.isArray(planContent.developmentAreas) &&
        planContent.developmentAreas.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Target className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">Priority Development Areas</h2>
            </div>
            <div className="grid gap-4">
              {planContent.developmentAreas.map((area, index) => (
                <Collapsible key={index}>
                  <Card className="border-amber-500/20 shadow-md overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="hover:bg-amber-500/5 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="text-left flex-1">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              {area.title}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="mt-2 border-amber-500/30 text-amber-600 dark:text-amber-400"
                            >
                              {area.timeline}
                            </Badge>
                          </div>
                          <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-6 space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-2">Current Gap</h4>
                          <p className="text-muted-foreground leading-relaxed">{area.gap}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-2">
                            Action Steps
                          </h4>
                          <ul className="space-y-2">
                            {area.actions.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                                <span className="text-amber-500 mt-1">→</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </section>
        )}

      {/* Resources Section */}
      {planContent.resources && Array.isArray(planContent.resources) && planContent.resources.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold">Learning Resources</h2>
          </div>
          <div className="grid gap-4">
            {planContent.resources.map((resource, index) => (
              <Collapsible key={index}>
                <Card className="border-blue-500/20 shadow-md overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="hover:bg-blue-500/5 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-left flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          {resource.area}
                        </CardTitle>
                        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-6">
                      <ul className="space-y-3">
                        {resource.items.map((item, idx) => (
                          <li key={idx} className="border-l-2 border-blue-500/30 pl-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground mb-1">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              </div>
                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors whitespace-nowrap flex items-center gap-1 shrink-0"
                                >
                                  View
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </section>
      )}

      {/* Milestones Section */}
      {planContent.milestones && Array.isArray(planContent.milestones) && planContent.milestones.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold">Key Milestones</h2>
          </div>
          <div className="grid gap-4">
            {planContent.milestones.map((milestone, index) => (
              <Collapsible key={index}>
                <Card className="border-purple-500/20 shadow-md overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="hover:bg-purple-500/5 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-left flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-purple-500" />
                          {milestone.title}
                        </CardTitle>
                        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-6">
                      <p className="text-muted-foreground leading-relaxed">{milestone.description}</p>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </section>
      )}

      {/* Timeline Section */}
      {planContent.timeline && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold">Timeline</h2>
          </div>
          <Card className="border-indigo-500/20 shadow-md">
            <CardContent className="pt-6">
              <p className="text-base text-muted-foreground leading-relaxed">{planContent.timeline}</p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
};

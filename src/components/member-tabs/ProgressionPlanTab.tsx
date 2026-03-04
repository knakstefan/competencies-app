import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  MapPin,
  Target,
  Flag,
  Trophy,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import type { TabCommonProps } from "./types";

/** Groups development areas by their timeline field. */
function groupByTimeline(
  areas: Array<{ title: string; gap: string; actions: string[]; timeline: string }>
): Map<string, typeof areas> {
  const groups = new Map<string, typeof areas>();
  for (const area of areas) {
    const key = area.timeline || "Ongoing";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(area);
  }
  return groups;
}

export function ProgressionPlanTab(props: TabCommonProps) {
  const {
    member,
    isAdmin,
    roleId,
    completedAssessments,
    plan,
    planContent,
    isPlanStale,
  } = props;

  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const generatePlanAction = useAction(api.ai.generatePromotionPlan);

  const hasCompletedAssessments = completedAssessments.length > 0;

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      await generatePlanAction({
        memberId: member._id,
        ...(roleId ? { roleId: roleId as any } : {}),
      });
      toast({ title: "Success", description: "Plan generated successfully!" });
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
          description: "Failed to generate plan. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // Empty state: no completed assessments
  if (!hasCompletedAssessments) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-1">Assessments needed first</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Complete at least one assessment from the Overview tab before generating a progression plan.
        </p>
      </div>
    );
  }

  // Empty state: assessments exist but no plan yet
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-1">No progression plan yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Generate an AI-powered progression plan based on {member.name}'s assessment data to identify strengths, development areas, and milestones.
        </p>
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
                Generate Progression Plan
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // --- Plan display: vertical timeline ---

  // Build ordered timeline groups for development areas
  const devAreas = planContent?.developmentAreas ?? [];
  const timelineGroups = groupByTimeline(devAreas);

  // Running node index for staggered animation delay
  let nodeIndex = 0;

  // Helper: get the next animation index and increment
  const nextDelay = () => {
    const i = nodeIndex;
    nodeIndex++;
    return i;
  };

  return (
    <div className="space-y-6">
      {/* Header with generate/regenerate button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Plan generated {format(new Date(plan.generatedAt), "MMM d, yyyy")}
        </span>
        {isAdmin && (
          <Button
            onClick={handleGeneratePlan}
            disabled={generating}
            variant="outline"
            size="sm"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Regenerate
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stale plan banner */}
      {isPlanStale && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm">
          <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-muted-foreground">
            New assessment data available since this plan was generated.
          </span>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-orange-500 hover:text-orange-400 h-7 px-2"
              onClick={handleGeneratePlan}
              disabled={generating}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${generating ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          )}
        </div>
      )}

      {/* AI Summary */}
      {planContent?.summary && (
        <Card className="bg-primary/5 border-primary/15">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {planContent.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ===== VERTICAL TIMELINE ===== */}
      <div className="relative">
        {/* Animated vertical spine */}
        <div className="absolute left-4 md:left-5 top-4 md:top-5 bottom-4 md:bottom-5 w-0.5 animate-line-grow bg-gradient-to-b from-green-500 via-primary/50 to-primary origin-top" />

        {/* ── Origin node: Where you are now ── */}
        {(() => {
          const delay = nextDelay();
          return (
            <div
              className="flex gap-3 md:gap-4 pb-8 md:pb-10 animate-fade-up"
              style={{ animationDelay: `${delay * 100}ms` }}
            >
              {/* Node circle */}
              <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-green-500/30">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-green-500 mb-1">Where you are now</h3>
                {plan.memberCurrentRole && (
                  <Badge variant="outline" className="border-green-500/30 text-green-500 mb-3">
                    {plan.memberCurrentRole}
                  </Badge>
                )}
                {/* Strength cards */}
                {planContent?.strengths && planContent.strengths.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                    {planContent.strengths.map((strength, i) => (
                      <Card key={i} className="border-green-500/20">
                        <CardContent className="p-3">
                          <h4 className="font-semibold text-xs text-green-500 mb-0.5">{strength.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{strength.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Development area nodes grouped by timeline ── */}
        {timelineGroups.size > 0 && (
          <Accordion type="multiple" className="space-y-0">
            {Array.from(timelineGroups.entries()).map(([timelineLabel, areas]) => (
              <div key={timelineLabel}>
                {/* Segment label */}
                <div
                  className="flex gap-3 md:gap-4 pb-3 animate-fade-up"
                  style={{ animationDelay: `${nextDelay() * 100}ms` }}
                >
                  <div className="w-8 md:w-10 shrink-0" />
                  <div className="flex-1">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {timelineLabel}
                    </Badge>
                  </div>
                </div>

                {/* Development area nodes */}
                {areas.map((area, areaIdx) => {
                  const delay = nextDelay();
                  const matchedResources = planContent?.resources?.find(
                    (r) => r.area.toLowerCase() === area.title.toLowerCase()
                  );
                  return (
                    <div
                      key={`${timelineLabel}-${areaIdx}`}
                      className="flex gap-3 md:gap-4 pb-8 md:pb-10 animate-fade-up"
                      style={{ animationDelay: `${delay * 100}ms` }}
                    >
                      {/* Node circle */}
                      <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-card border-2 border-orange-500 text-orange-500 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-orange-500/30">
                          <Target className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <AccordionItem
                          value={`dev-${timelineLabel}-${areaIdx}`}
                          className="border-0"
                        >
                          <AccordionTrigger className="hover:no-underline py-0 min-w-0 [&>svg]:hidden">
                            <div className="w-full">
                              <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                <span className="font-semibold text-sm truncate">{area.title}</span>
                                <Badge variant="outline" className="text-xs shrink-0">{area.timeline || "Ongoing"}</Badge>
                                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 text-left mt-1 w-full">
                                {area.gap}
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2 break-words">
                              {area.actions && area.actions.length > 0 && (
                                <ul className="space-y-1.5">
                                  {area.actions.map((action, aIdx) => (
                                    <li key={aIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary mt-0.5 shrink-0">&rarr;</span>
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {matchedResources && matchedResources.items.length > 0 && (
                                <div className="pt-2 border-t border-border/50">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <BookOpen className="w-3 h-3" />
                                    Resources
                                  </p>
                                  <ul className="space-y-1.5">
                                    {matchedResources.items.map((item, idx) => (
                                      <li key={idx} className="text-xs">
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 min-w-0">
                                            <span className="font-medium text-foreground">{item.name}</span>
                                            <p className="text-muted-foreground mt-0.5">{item.description}</p>
                                          </div>
                                          {item.link && (
                                            <a
                                              href={item.link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-primary hover:underline whitespace-nowrap shrink-0 flex items-center gap-0.5"
                                            >
                                              View
                                              <ArrowUpRight className="w-3 h-3" />
                                            </a>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </Accordion>
        )}

        {/* ── Milestones segment ── */}
        {planContent?.milestones && planContent.milestones.length > 0 && (
          <>
            {/* Segment label */}
            <div
              className="flex gap-3 md:gap-4 pb-3 animate-fade-up"
              style={{ animationDelay: `${nextDelay() * 100}ms` }}
            >
              <div className="w-8 md:w-10 shrink-0" />
              <div className="flex-1">
                <Badge variant="secondary" className="text-xs font-medium">
                  Milestones
                </Badge>
              </div>
            </div>

            {/* Milestone nodes */}
            {planContent.milestones.map((milestone, i) => {
              const delay = nextDelay();
              return (
                <div
                  key={i}
                  className="flex gap-3 md:gap-4 pb-8 md:pb-10 animate-fade-up"
                  style={{ animationDelay: `${delay * 100}ms` }}
                >
                  {/* Diamond node */}
                  <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                    <div className="w-8 h-8 md:w-10 md:h-10 rotate-45 rounded-sm bg-card border-2 border-primary text-primary flex items-center justify-center transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-primary/30">
                      <Flag className="w-4 h-4 md:w-5 md:h-5 -rotate-45" />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{milestone.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Destination node: Where you're going ── */}
        {(() => {
          const delay = nextDelay();
          return (
            <div
              className="flex gap-3 md:gap-4 animate-fade-up"
              style={{ animationDelay: `${delay * 100}ms` }}
            >
              {/* Node circle */}
              <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-primary/30">
                  <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-primary mb-1">Where you're going</h3>
                {plan.targetLevel && (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {plan.targetLevel}
                  </Badge>
                )}
                {planContent?.timeline && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{planContent.timeline}</p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

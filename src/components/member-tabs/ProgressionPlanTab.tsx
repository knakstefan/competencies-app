import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ClipboardCheck,
  MapPin,
  Target,
  Flag,
  Trophy,
  ChevronDown,
  ArrowRight,
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

  // --- Plan display ---

  const devAreas = planContent?.developmentAreas ?? [];
  const timelineGroups = groupByTimeline(devAreas);
  const milestones = planContent?.milestones ?? [];
  const timelineKeys = Array.from(timelineGroups.keys());

  // Distribute milestones across timeline groups as checkpoints
  // If there are more milestones than groups, extras go on the last group
  const milestonesByGroup = new Map<string, typeof milestones>();
  if (milestones.length > 0 && timelineKeys.length > 0) {
    const perGroup = Math.max(1, Math.ceil(milestones.length / timelineKeys.length));
    let mIdx = 0;
    for (const key of timelineKeys) {
      const groupMilestones = milestones.slice(mIdx, mIdx + perGroup);
      if (groupMilestones.length > 0) milestonesByGroup.set(key, groupMilestones);
      mIdx += perGroup;
    }
    // Any remaining milestones go on the last group
    if (mIdx < milestones.length) {
      const lastKey = timelineKeys[timelineKeys.length - 1];
      const existing = milestonesByGroup.get(lastKey) || [];
      milestonesByGroup.set(lastKey, [...existing, ...milestones.slice(mIdx)]);
    }
  }

  // Find the primary development gap for the readiness section
  const primaryGap = devAreas[0]?.title;

  let nodeIndex = 0;
  const nextDelay = () => {
    const i = nodeIndex;
    nodeIndex++;
    return i;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* ===== VERTICAL TIMELINE ===== */}
      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-4 md:left-5 top-4 md:top-5 bottom-4 md:bottom-5 w-0.5 animate-line-grow bg-gradient-to-b from-green-500 via-primary/50 to-primary origin-top" />

        {/* ── Origin: Where you are now ── */}
        {(() => {
          const delay = nextDelay();
          return (
            <div
              className="flex gap-3 md:gap-4 pb-8 md:pb-10 animate-fade-up"
              style={{ animationDelay: `${delay * 100}ms` }}
            >
              <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 text-white flex items-center justify-center cursor-default">
                      <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Current level</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-500/50 font-medium uppercase tracking-wide mb-0.5">Current level</p>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-green-500">{plan.memberCurrentRole || member.role}</h3>
                </div>
                {/* Strengths as compact inline badges */}
                {planContent?.strengths && planContent.strengths.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Strengths:</span>
                    {planContent.strengths.map((strength, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs font-normal bg-green-500/10 text-green-400 border-0"
                        title={strength.description}
                      >
                        {strength.title}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Development areas grouped by timeline ── */}
        {timelineGroups.size > 0 && (
          <Accordion type="multiple" className="space-y-0">
            {Array.from(timelineGroups.entries()).map(([timelineLabel, areas]) => {
              const groupMilestones = milestonesByGroup.get(timelineLabel) || [];
              return (
                <div key={timelineLabel}>
                  {/* Timeline segment label */}
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
                    const firstAction = area.actions?.[0];
                    const remainingCount = (area.actions?.length || 0) - 1;
                    return (
                      <div
                        key={`${timelineLabel}-${areaIdx}`}
                        className="flex gap-3 md:gap-4 pb-6 md:pb-8 animate-fade-up"
                        style={{ animationDelay: `${delay * 100}ms` }}
                      >
                        <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-card border-2 border-orange-500 text-orange-500 flex items-center justify-center cursor-default">
                                <Target className="w-4 h-4 md:w-5 md:h-5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">Development area</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex-1 min-w-0">
                          <AccordionItem
                            value={`dev-${timelineLabel}-${areaIdx}`}
                            className="border-0"
                          >
                            <AccordionTrigger className="hover:no-underline py-0 min-w-0 [&>svg]:hidden">
                              <div className="w-full">
                                <p className="text-xs text-orange-500/50 font-medium uppercase tracking-wide mb-0.5 text-left">Development area</p>
                                <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                  <span className="font-semibold text-sm truncate">{area.title}</span>
                                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                                </div>
                                {/* Collapsed preview — hidden when expanded */}
                                {firstAction && (
                                  <div className="flex items-start gap-1.5 mt-1.5 text-left [[data-state=open]_&]:hidden">
                                    <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                    <span className="text-xs text-muted-foreground line-clamp-1">{firstAction}</span>
                                    {remainingCount > 0 && (
                                      <span className="text-xs text-primary/70 font-medium shrink-0">+{remainingCount} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-2 break-words">
                                {area.actions && area.actions.length > 0 && (
                                  <ul className="space-y-1.5">
                                    {area.actions.map((action, aIdx) => (
                                      <li key={aIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <ArrowRight className="w-3 h-3 text-primary mt-1 shrink-0" />
                                        <span>{action}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {area.gap && (
                                  <p className="text-xs text-muted-foreground/50 pt-1">{area.gap}</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </div>
                      </div>
                    );
                  })}

                  {/* Milestones as inline checkpoints at end of this timeline group */}
                  {groupMilestones.map((milestone, mIdx) => {
                    const delay = nextDelay();
                    return (
                      <div
                        key={`milestone-${timelineLabel}-${mIdx}`}
                        className="flex gap-3 md:gap-4 pb-6 md:pb-8 animate-fade-up"
                        style={{ animationDelay: `${delay * 100}ms` }}
                      >
                        <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 border border-dashed border-primary/40 text-primary flex items-center justify-center cursor-default">
                                <Flag className="w-4 h-4 md:w-5 md:h-5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">Milestone goal</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary/50 font-medium uppercase tracking-wide mb-0.5">Milestone</p>
                          <p className="text-sm font-medium">{milestone.title}</p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">{milestone.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </Accordion>
        )}

        {/* ── Destination: Readiness assessment ── */}
        {(() => {
          const delay = nextDelay();
          return (
            <div
              className="flex gap-3 md:gap-4 animate-fade-up"
              style={{ animationDelay: `${delay * 100}ms` }}
            >
              <div className="w-8 md:w-10 shrink-0 flex justify-center pt-0.5 relative z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-default">
                      <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Target level</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary/50 font-medium uppercase tracking-wide mb-0.5">Target level</p>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-primary">{plan.targetLevel || "Next level"}</h3>
                </div>
                {planContent?.timeline && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {planContent.timeline}
                    {primaryGap && (
                      <span className="text-muted-foreground/60">
                        {" "}Primary focus area: {primaryGap}.
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

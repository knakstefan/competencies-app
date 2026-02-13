import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation, useAction } from "convex/react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Competency, SubCompetency } from "@/types/competency";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Check, Sparkles, ChevronDown } from "lucide-react";
import { AssessmentSummary } from "./AssessmentSummary";
import { WizardNavigationRail } from "./wizards/WizardNavigationRail";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RATING_OPTIONS } from "@/lib/ratingConstants";
import {
  RoleLevel,
  FALLBACK_LEVELS,
  getLevelAbove as sharedGetLevelAbove,
  getLevelNBelow as sharedGetLevelNBelow,
  getLevelNAbove as sharedGetLevelNAbove,
  getCriteriaForLevelWithFallback,
  labelToKey,
  keyToLabel,
} from "@/lib/levelUtils";

// --- Helpers ---

const RATING_PRIORITY: Record<string, number> = {
  well_below: 1, below: 2, target: 3, above: 4, well_above: 5,
};

function getWorstRating(evaluations: Record<string, string> | undefined): string | null {
  if (!evaluations) return null;
  const values = Object.values(evaluations).filter(Boolean);
  if (values.length === 0) return null;
  return values.reduce((worst, current) =>
    (RATING_PRIORITY[current] ?? 3) < (RATING_PRIORITY[worst] ?? 3) ? current : worst
  );
}

// --- Interfaces ---

interface GeneratedPrompt {
  subCompetencyId: string;
  prompts: Array<{ question: string; lookFor: string }>;
}

interface AssessmentWizardProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberRole: string;
  memberName: string;
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  existingAssessmentId?: string | null;
  levels?: RoleLevel[];
  roleId?: string;
}

export const AssessmentWizard = ({
  open,
  onClose,
  memberId,
  memberRole,
  memberName,
  competencies,
  subCompetencies,
  existingAssessmentId = null,
  levels = FALLBACK_LEVELS,
  roleId,
}: AssessmentWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentId, setAssessmentId] = useState<Id<"assessments"> | null>(null);
  const [assessmentData, setAssessmentData] = useState<
    Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }>
  >({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<Record<string, string | null>>({});
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.assessments.createDraft);
  const upsertProgress = useMutation(api.progress.upsert);
  const replaceEvals = useMutation(api.evaluations.replaceForProgress);
  const completeAssessment = useMutation(api.assessments.complete);
  const generateAssessmentPrompts = useAction(api.ai.generateAssessmentPrompts);

  // --- Computed values ---

  const orderedSubCompetencies = useMemo(() =>
    [...subCompetencies].sort((a, b) => {
      const compA = competencies.find((c) => c._id === a.competencyId);
      const compB = competencies.find((c) => c._id === b.competencyId);
      if (compA && compB && compA.orderIndex !== compB.orderIndex) {
        return compA.orderIndex - compB.orderIndex;
      }
      return a.orderIndex - b.orderIndex;
    }),
    [subCompetencies, competencies]
  );

  const totalSteps = orderedSubCompetencies.length + 1; // +1 for summary
  const isSummaryStep = currentStep >= orderedSubCompetencies.length;
  const memberLevelKey = labelToKey(levels, memberRole);

  const currentSubCompetency = !isSummaryStep ? orderedSubCompetencies[currentStep] : null;
  const currentCompetency = currentSubCompetency
    ? competencies.find((c) => c._id === currentSubCompetency.competencyId)
    : null;
  const currentData = currentSubCompetency ? assessmentData[currentSubCompetency._id] : null;
  const targetCriteria = currentSubCompetency
    ? getCriteriaForLevelWithFallback(currentSubCompetency, memberLevelKey)
    : [];
  const hasAboveOption = sharedGetLevelAbove(levels, memberLevelKey) !== null;

  // Level navigation helpers
  const getLevelNBelow = (level: string, n: number): string | null => sharedGetLevelNBelow(levels, level, n);
  const getLevelNAbove = (level: string, n: number): string | null => sharedGetLevelNAbove(levels, level, n);

  const getDisplayLevel = (evaluation: string, baseLevel: string): string | null => {
    switch (evaluation) {
      case "well_below": return getLevelNBelow(baseLevel, 2);
      case "below": return getLevelNBelow(baseLevel, 1);
      case "above": return getLevelNAbove(baseLevel, 1);
      case "well_above": return getLevelNAbove(baseLevel, 2);
      default: return null;
    }
  };

  // Hint for a specific criterion at a specific rating
  const getHintForCriterion = (criterionIndex: number, ratingValue: string): string => {
    const genericHint = RATING_OPTIONS.find(o => o.value === ratingValue)?.hint || "";
    if (ratingValue === "target" || !currentSubCompetency) return genericHint;
    const hintLevel = getDisplayLevel(ratingValue, memberLevelKey);
    if (!hintLevel) return genericHint;
    const hintCriteria = getCriteriaForLevelWithFallback(currentSubCompetency, hintLevel);
    const hintText = hintCriteria[criterionIndex];
    if (hintText) return `${keyToLabel(levels, hintLevel)}: ${hintText}`;
    return genericHint;
  };

  // --- Nav rail data adapter ---

  const navCategories = useMemo(() => {
    const seen = new Set<string>();
    const cats: string[] = [];
    for (const sub of orderedSubCompetencies) {
      const comp = competencies.find(c => c._id === sub.competencyId);
      const title = comp?.title || "Unknown";
      if (!seen.has(title)) {
        seen.add(title);
        cats.push(title);
      }
    }
    return cats;
  }, [orderedSubCompetencies, competencies]);

  const navQuestions = useMemo(() =>
    orderedSubCompetencies.map(sub => {
      const comp = competencies.find(c => c._id === sub.competencyId);
      return { category: comp?.title || "Unknown" };
    }),
    [orderedSubCompetencies, competencies]
  );

  const navResponses = useMemo(() => {
    const result: Record<number, { rating: string | null; notes: string | null }> = {};
    orderedSubCompetencies.forEach((sub, idx) => {
      const data = assessmentData[sub._id];
      if (data) {
        result[idx] = {
          rating: getWorstRating(data.evaluations),
          notes: data.notes || null,
        };
      }
    });
    return result;
  }, [orderedSubCompetencies, assessmentData]);

  // --- Debounce refs ---

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assessmentDataRef = useRef(assessmentData);
  const currentStepRef = useRef(currentStep);
  assessmentDataRef.current = assessmentData;
  currentStepRef.current = currentStep;

  // --- DB operations ---

  const saveProgressToDatabase = async (
    assessmentIdParam: Id<"assessments">,
    subCompetencyId: Id<"subCompetencies">,
    level: string,
    notes?: string,
    evaluations?: Record<string, string>,
  ) => {
    if (!assessmentIdParam) return;
    try {
      const progressId = await upsertProgress({
        assessmentId: assessmentIdParam,
        memberId: memberId as Id<"teamMembers">,
        subCompetencyId,
        currentLevel: level,
        notes: notes || undefined,
      });
      if (progressId && evaluations) {
        const evaluationsToInsert = Object.entries(evaluations)
          .filter(([_, evaluation]) => evaluation)
          .map(([criterion, evaluation]) => ({
            criterionText: criterion,
            evaluation: evaluation,
          }));
        if (evaluationsToInsert.length > 0) {
          await replaceEvals({ progressId, evaluations: evaluationsToInsert });
        }
      }
    } catch (error) {
      console.error("Error saving progress to database:", error);
    }
  };

  // Flush current step's data to DB (awaitable)
  const flushCurrentProgress = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const step = currentStepRef.current;
    if (step < orderedSubCompetencies.length && assessmentId) {
      const sub = orderedSubCompetencies[step];
      const data = assessmentDataRef.current[sub._id];
      if (data) {
        await saveProgressToDatabase(
          assessmentId,
          sub._id as Id<"subCompetencies">,
          data.level,
          data.notes,
          data.evaluations,
        );
      }
    }
  }, [assessmentId, orderedSubCompetencies]);

  // Fire-and-forget version for cleanup effects
  const flushSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const step = currentStepRef.current;
    if (step < orderedSubCompetencies.length && assessmentId) {
      const sub = orderedSubCompetencies[step];
      const data = assessmentDataRef.current[sub._id];
      if (data) {
        saveProgressToDatabase(
          assessmentId,
          sub._id as Id<"subCompetencies">,
          data.level,
          data.notes,
          data.evaluations,
        );
      }
    }
  }, [assessmentId, orderedSubCompetencies]);

  // --- Debounced auto-save effect ---

  const currentSubId = currentSubCompetency?._id ?? null;
  const currentStepData = currentSubId ? assessmentData[currentSubId] : null;

  useEffect(() => {
    if (!currentSubId || !currentStepData || !assessmentId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveProgressToDatabase(
        assessmentId,
        currentSubId as Id<"subCompetencies">,
        currentStepData.level,
        currentStepData.notes,
        currentStepData.evaluations,
      );
      debounceRef.current = null;
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentStepData, currentSubId, assessmentId]);

  // Flush on unmount / assessmentId change
  useEffect(() => {
    return () => { flushSave(); };
  }, [flushSave]);

  // --- Open/close effect ---

  useEffect(() => {
    if (open) {
      if (existingAssessmentId) {
        setAssessmentId(existingAssessmentId as Id<"assessments">);
        loadExistingAssessment(existingAssessmentId as Id<"assessments">);
      } else {
        createDraftAssessment();
      }
    } else {
      // Reset all state unconditionally on close
      setCurrentStep(0);
      setAssessmentId(null);
      setAssessmentData({});
      setGeneratedPrompts([]);
      setGeneratingPrompts(false);
      setHoveredRating({});
    }
  }, [open, existingAssessmentId]);

  // --- Assessment CRUD ---

  const createDraftAssessment = async () => {
    setInitializing(true);
    try {
      const newId = await createDraftMutation({
        memberId: memberId as Id<"teamMembers">,
      });
      setAssessmentId(newId);
      await loadPreviousAssessmentData(newId);
      generateAndStorePrompts(newId);
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
    } finally {
      setInitializing(false);
    }
  };

  const generateAndStorePrompts = async (assessId: Id<"assessments">) => {
    setGeneratingPrompts(true);
    try {
      const prompts = await generateAssessmentPrompts({
        memberId: memberId as Id<"teamMembers">,
        assessmentId: assessId,
        roleId: roleId ? (roleId as Id<"roles">) : undefined,
      });
      setGeneratedPrompts(prompts);
    } catch (error) {
      console.error("Failed to generate AI assessment prompts:", error);
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const loadPreviousAssessmentData = async (newAssessmentId: Id<"assessments">) => {
    try {
      const completedAssessments = await client.query(
        api.assessments.getCompletedForMember,
        { memberId: memberId as Id<"teamMembers"> }
      );
      const latestAssessment = completedAssessments.length > 0
        ? completedAssessments[completedAssessments.length - 1]
        : null;
      if (!latestAssessment) return;

      const progressData = await client.query(
        api.progress.listForAssessment,
        { assessmentId: latestAssessment._id }
      );
      if (!progressData || progressData.length === 0) return;

      const progressIds = progressData.map((p) => p._id);
      const allEvals = await client.query(
        api.evaluations.listForProgressIds,
        { progressIds }
      );

      const loadedData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }> = {};
      for (const p of progressData) {
        const evalsForProgress = allEvals.filter((e) => e.progressId === p._id);
        const evaluations: Record<string, string> = {};
        evalsForProgress.forEach((e) => { evaluations[e.criterionText] = e.evaluation; });

        const dataForSubComp = {
          level: p.currentLevel,
          notes: p.notes || undefined,
          evaluations: Object.keys(evaluations).length > 0 ? evaluations : undefined,
        };
        loadedData[p.subCompetencyId] = dataForSubComp;

        await saveProgressToDatabase(
          newAssessmentId,
          p.subCompetencyId as Id<"subCompetencies">,
          dataForSubComp.level,
          dataForSubComp.notes,
          dataForSubComp.evaluations,
        );
      }
      setAssessmentData(loadedData);
    } catch (error) {
      console.error("Error loading previous assessment data:", error);
    }
  };

  const loadExistingAssessment = async (id: Id<"assessments">) => {
    setInitializing(true);
    try {
      const assessment = await client.query(api.assessments.getById, { id });
      if (assessment?.generatedPrompts) {
        setGeneratedPrompts(assessment.generatedPrompts);
      }

      const progressData = await client.query(
        api.progress.listForAssessment,
        { assessmentId: id }
      );
      const progressIds = (progressData || []).map((p) => p._id);
      const allEvals = progressIds.length > 0
        ? await client.query(api.evaluations.listForProgressIds, { progressIds })
        : [];

      const loadedData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }> = {};
      for (const p of progressData || []) {
        const evalsForProgress = allEvals.filter((e) => e.progressId === p._id);
        const evaluations: Record<string, string> = {};
        evalsForProgress.forEach((e) => { evaluations[e.criterionText] = e.evaluation; });
        loadedData[p.subCompetencyId] = {
          level: p.currentLevel,
          notes: p.notes || undefined,
          evaluations: Object.keys(evaluations).length > 0 ? evaluations : undefined,
        };
      }
      setAssessmentData(loadedData);

      // Navigate to furthest completion point
      if (assessment?.status === "completed") {
        setCurrentStep(orderedSubCompetencies.length); // summary step
      } else {
        const firstIncomplete = orderedSubCompetencies.findIndex(
          sub => !loadedData[sub._id]?.evaluations || Object.keys(loadedData[sub._id]?.evaluations || {}).length === 0
        );
        setCurrentStep(firstIncomplete === -1 ? orderedSubCompetencies.length : firstIncomplete);
      }
    } catch (error) {
      console.error("Error loading assessment:", error);
      toast({ title: "Error", description: "Failed to load assessment", variant: "destructive" });
    } finally {
      setInitializing(false);
    }
  };

  // --- Event handlers ---

  const handleEvaluationChange = (criterion: string, evaluation: string) => {
    if (!currentSubCompetency) return;
    const level = currentData?.level || memberLevelKey;
    const newEvaluations = { ...(currentData?.evaluations || {}), [criterion]: evaluation };
    setAssessmentData(prev => ({
      ...prev,
      [currentSubCompetency._id]: { level, notes: currentData?.notes, evaluations: newEvaluations },
    }));
  };

  const handleNotesChange = (notes: string) => {
    if (!currentSubCompetency) return;
    const level = currentData?.level || memberLevelKey;
    setAssessmentData(prev => ({
      ...prev,
      [currentSubCompetency._id]: { level, notes, evaluations: currentData?.evaluations },
    }));
  };

  const handleDotNavigate = async (step: number) => {
    await flushCurrentProgress();
    setCurrentStep(step);
    setHoveredRating({});
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      // Set default "target" for unevaluated criteria
      if (currentSubCompetency && targetCriteria.length > 0) {
        const currentEvals = assessmentData[currentSubCompetency._id]?.evaluations || {};
        const hasUnevaluated = targetCriteria.some(c => !currentEvals[c]);
        if (hasUnevaluated) {
          const updatedEvals = { ...currentEvals };
          targetCriteria.forEach(c => { if (!updatedEvals[c]) updatedEvals[c] = "target"; });
          const newEntry = {
            level: assessmentData[currentSubCompetency._id]?.level || memberLevelKey,
            notes: assessmentData[currentSubCompetency._id]?.notes,
            evaluations: updatedEvals,
          };
          setAssessmentData(prev => ({ ...prev, [currentSubCompetency._id]: newEntry }));
          // Update ref manually so flush reads the defaults
          assessmentDataRef.current = { ...assessmentDataRef.current, [currentSubCompetency._id]: newEntry };
        }
      }
      await flushCurrentProgress();
      setCurrentStep(currentStep + 1);
      setHoveredRating({});
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setHoveredRating({});
    }
  };

  const handleComplete = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      await flushCurrentProgress();
      const totalSubCompetencies = subCompetencies.length;
      const assessedCount = Object.keys(assessmentData).length;
      const overallScore = (assessedCount / totalSubCompetencies) * 100;

      await completeAssessment({ id: assessmentId, overallScore });
      toast({ title: "Success", description: "Assessment completed successfully" });
      onClose();
    } catch (error) {
      console.error("Error completing assessment:", error);
      toast({ title: "Error", description: "Failed to complete assessment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- JSX ---

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        flushCurrentProgress();
        onClose();
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0">
        {/* Gradient top border */}
        <div className="h-1 bg-gradient-knak shrink-0" />

        {/* Header */}
        <div className="shrink-0 px-6 pt-4 pb-3 space-y-4">
          <DialogHeader>
            <DialogTitle>Team Assessment — {memberName}</DialogTitle>
          </DialogHeader>
          {!initializing && (
            <WizardNavigationRail
              categories={navCategories}
              questions={navQuestions}
              responses={navResponses}
              currentStep={currentStep}
              onNavigate={handleDotNavigate}
              isSummaryStep={isSummaryStep}
            />
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
          {initializing ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              <p className="text-sm">Initializing assessment...</p>
            </div>
          ) : isSummaryStep ? (
            <AssessmentSummary
              competencies={competencies}
              subCompetencies={subCompetencies}
              assessmentData={assessmentData}
            />
          ) : currentSubCompetency ? (
            <div key={currentStep} className="animate-fade-up space-y-4">
              {/* Category header */}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {currentCompetency?.title}
              </p>

              {/* Sub-competency title */}
              <p className="text-lg font-medium">{currentSubCompetency.title}</p>

              {/* AI Discussion Prompts */}
              {(() => {
                const currentPrompts = generatedPrompts.find(
                  (p) => p.subCompetencyId === currentSubCompetency._id
                );
                if (generatingPrompts) {
                  return (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span>Generating AI discussion prompts...</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                if (currentPrompts && currentPrompts.prompts.length > 0) {
                  return (
                    <Collapsible defaultOpen>
                      <Card className="border-primary/20">
                        <CardContent className="pt-4 pb-4">
                          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                            <Sparkles className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-medium flex-1">AI Discussion Prompts</span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3 space-y-3">
                            {currentPrompts.prompts.map((prompt, i) => (
                              <div key={i} className="pl-6 space-y-1">
                                <p className="text-sm font-medium">{prompt.question}</p>
                                <p className="text-xs text-muted-foreground">{prompt.lookFor}</p>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </CardContent>
                      </Card>
                    </Collapsible>
                  );
                }
                return null;
              })()}

              {/* Per-criterion blocks */}
              {targetCriteria.length > 0 && (
                <div className="space-y-4">
                  {targetCriteria.map((criterion, index) => {
                    const currentEvaluation = currentData?.evaluations?.[criterion] || "target";
                    const activeRating = hoveredRating[criterion] || currentEvaluation;
                    const hint = getHintForCriterion(index, activeRating);

                    return (
                      <div key={index} className="space-y-1.5">
                        {/* Static criterion text */}
                        <p className="text-sm font-medium">{criterion}</p>

                        {/* Rating tabs */}
                        <Tabs
                          value={currentEvaluation}
                          onValueChange={(value) => handleEvaluationChange(criterion, value)}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-5">
                            {RATING_OPTIONS.map((opt) => (
                              <TabsTrigger
                                key={opt.value}
                                value={opt.value}
                                className={cn("text-xs px-1", opt.colorClass)}
                                disabled={
                                  (opt.value === "above" || opt.value === "well_above") && !hasAboveOption
                                }
                                onMouseEnter={() =>
                                  setHoveredRating(prev => ({ ...prev, [criterion]: opt.value }))
                                }
                                onMouseLeave={() =>
                                  setHoveredRating(prev => ({ ...prev, [criterion]: null }))
                                }
                              >
                                {opt.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>

                        {/* Hint line */}
                        <p className="text-xs text-muted-foreground h-4">
                          {hint || "\u00A0"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={currentData?.notes || ""}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add notes about this assessment..."
                  rows={3}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!initializing && (
          <div className="shrink-0 px-6 pt-3 pb-4 border-t">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0 || initializing}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {isSummaryStep ? (
                <Button onClick={handleComplete} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Complete Assessment
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={initializing}>
                  {currentStep === orderedSubCompetencies.length - 1 ? "Review" : "Next"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

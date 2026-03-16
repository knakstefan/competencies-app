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

import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Check, AlertTriangle } from "lucide-react";
import { AssessmentSummary } from "./AssessmentSummary";
import { WizardNavigationRail } from "./wizards/WizardNavigationRail";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RATING_OPTIONS } from "@/lib/ratingConstants";
import {
  RoleLevel,
  FALLBACK_LEVELS,
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

function getMajorityRating(evaluations: Record<string, string> | undefined): string | null {
  if (!evaluations) return null;
  const values = Object.values(evaluations).filter(Boolean);
  if (values.length === 0) return null;

  let belowCount = 0;
  let aboveCount = 0;
  let worstBelow: string | null = null;
  let bestAbove: string | null = null;

  for (const v of values) {
    const score = RATING_PRIORITY[v] ?? 3;
    if (score < 3) {
      belowCount++;
      if (!worstBelow || score < (RATING_PRIORITY[worstBelow] ?? 3)) worstBelow = v;
    } else if (score > 3) {
      aboveCount++;
      if (!bestAbove || score > (RATING_PRIORITY[bestAbove] ?? 3)) bestAbove = v;
    }
  }

  const majority = values.length / 2;
  if (belowCount > majority) return worstBelow;
  if (aboveCount > majority) return bestAbove;
  return "target";
}

// --- Interfaces ---

interface GeneratedSummary {
  overallNarrative: string;
  strengths: Array<{ competency: string; detail: string }>;
  areasNeedingSupport: Array<{
    competency: string;
    subCompetency: string;
    criterion: string;
    rating: string;
    currentLevelExpectation: string;
    nextLevelExpectation: string;
    guidance: string;
  }>;
  overallReadiness: string;
}

interface CompetencyStep {
  competency: Competency;
  subCompetencies: SubCompetency[];
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
  const [hoveredRating, setHoveredRating] = useState<Record<string, string | null>>({});
  const [showUnratedWarning, setShowUnratedWarning] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<GeneratedSummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryDataKey, setSummaryDataKey] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.assessments.createDraft);
  const upsertProgress = useMutation(api.progress.upsert);
  const replaceEvals = useMutation(api.evaluations.replaceForProgress);
  const completeAssessment = useMutation(api.assessments.complete);
  const generateAssessmentSummaryAction = useAction(api.ai.generateAssessmentSummary);

  // --- Computed values ---

  // Group sub-competencies by competency to create steps
  const competencySteps = useMemo((): CompetencyStep[] => {
    const sortedComps = [...competencies].sort((a, b) => a.orderIndex - b.orderIndex);
    return sortedComps.map((comp) => ({
      competency: comp,
      subCompetencies: [...subCompetencies]
        .filter((sc) => sc.competencyId === comp._id)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    })).filter((step) => step.subCompetencies.length > 0);
  }, [competencies, subCompetencies]);

  const totalSteps = competencySteps.length + 1; // +1 for summary
  const isSummaryStep = currentStep >= competencySteps.length;
  const memberLevelKey = labelToKey(levels, memberRole);

  const currentCompetencyStep = !isSummaryStep ? competencySteps[currentStep] : null;

  // Stable fingerprint of evaluation data — used to detect changes for AI summary regeneration
  const assessmentFingerprint = useMemo(() => {
    return Object.entries(assessmentData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, data]) => {
        const evals = data.evaluations
          ? Object.entries(data.evaluations).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(",")
          : "";
        return `${id}:${evals}`;
      })
      .join("|");
  }, [assessmentData]);

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
  const getHintForCriterion = (sub: SubCompetency, criterionIndex: number, ratingValue: string): string => {
    const genericHint = RATING_OPTIONS.find(o => o.value === ratingValue)?.hint || "";
    if (ratingValue === "target") return genericHint;
    const hintLevel = getDisplayLevel(ratingValue, memberLevelKey);
    if (!hintLevel) return genericHint;
    const hintCriteria = getCriteriaForLevelWithFallback(sub, hintLevel);
    const hintText = hintCriteria[criterionIndex];
    if (hintText) return `${keyToLabel(levels, hintLevel)}: ${hintText}`;
    return genericHint;
  };

  // Count unrated criteria in the current step
  const getUnratedCount = useCallback((): number => {
    if (!currentCompetencyStep) return 0;
    let unrated = 0;
    for (const sub of currentCompetencyStep.subCompetencies) {
      const criteria = getCriteriaForLevelWithFallback(sub, memberLevelKey);
      const evals = assessmentData[sub._id]?.evaluations || {};
      for (const c of criteria) {
        if (!evals[c]) unrated++;
      }
    }
    return unrated;
  }, [currentCompetencyStep, assessmentData, memberLevelKey]);

  // --- Nav rail data adapter ---

  const navCategories = useMemo(() =>
    competencySteps.map((step) => step.competency.title),
    [competencySteps]
  );

  // One "question" per sub-competency, tagged with parent competency and step index
  const navQuestions = useMemo(() => {
    const questions: { category: string; stepIndex: number; subId: string }[] = [];
    competencySteps.forEach((step, stepIdx) => {
      for (const sub of step.subCompetencies) {
        questions.push({ category: step.competency.title, stepIndex: stepIdx, subId: sub._id });
      }
    });
    return questions;
  }, [competencySteps]);

  const navResponses = useMemo(() => {
    const result: Record<number, { rating: string | null; notes: string | null }> = {};
    let questionIdx = 0;
    competencySteps.forEach((step) => {
      for (const sub of step.subCompetencies) {
        const data = assessmentData[sub._id];
        if (data) {
          const rating = getMajorityRating(data.evaluations);
          if (rating) {
            result[questionIdx] = { rating, notes: data.notes ? "yes" : null };
          }
        }
        questionIdx++;
      }
    });
    return result;
  }, [competencySteps, assessmentData]);

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

  // Save all sub-competencies for a given competency step
  const saveStepProgress = useCallback(async (stepIndex: number) => {
    if (stepIndex >= competencySteps.length || !assessmentId) return;
    const step = competencySteps[stepIndex];
    const data = assessmentDataRef.current;
    for (const sub of step.subCompetencies) {
      const subData = data[sub._id];
      if (subData) {
        await saveProgressToDatabase(
          assessmentId,
          sub._id as Id<"subCompetencies">,
          subData.level,
          subData.notes,
          subData.evaluations,
        );
      }
    }
  }, [assessmentId, competencySteps]);

  // Flush current step's data to DB (awaitable)
  const flushCurrentProgress = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await saveStepProgress(currentStepRef.current);
  }, [saveStepProgress]);

  // Fire-and-forget version for cleanup effects
  const flushSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    saveStepProgress(currentStepRef.current);
  }, [saveStepProgress]);

  // --- Debounced auto-save effect ---

  // Build a stable key for the current step's data to trigger debounced saves
  const currentStepDataKey = useMemo(() => {
    if (isSummaryStep || !currentCompetencyStep) return null;
    return currentCompetencyStep.subCompetencies
      .map((sub) => JSON.stringify(assessmentData[sub._id] || null))
      .join("|");
  }, [isSummaryStep, currentCompetencyStep, assessmentData]);

  useEffect(() => {
    if (!currentStepDataKey || !assessmentId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveStepProgress(currentStepRef.current);
      debounceRef.current = null;
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentStepDataKey, assessmentId, saveStepProgress]);

  // Flush on unmount / assessmentId change
  useEffect(() => {
    return () => { flushSave(); };
  }, [flushSave]);

  // Scroll after step render: to a specific sub-competency, or to the top
  useEffect(() => {
    if (!scrollTarget) return;
    const target = scrollTarget;
    setScrollTarget(null);
    requestAnimationFrame(() => {
      if (target === "__top__") {
        scrollContainerRef.current?.scrollTo(0, 0);
      } else {
        const el = document.getElementById(`sub-${target}`);
        if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
  }, [scrollTarget]);

  // Track which sub-competency is closest to the top of the scroll container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isSummaryStep || !currentCompetencyStep) return;

    const subIds = currentCompetencyStep.subCompetencies.map((s) => s._id);
    if (subIds.length <= 1) {
      setActiveSubId(subIds[0] ?? null);
      return;
    }

    const updateActive = () => {
      const containerTop = container.getBoundingClientRect().top;
      let closest: string | null = null;
      let closestDist = Infinity;
      for (const id of subIds) {
        const el = document.getElementById(`sub-${id}`);
        if (!el) continue;
        const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
        if (dist < closestDist) {
          closestDist = dist;
          closest = id;
        }
      }
      setActiveSubId(closest);
    };

    updateActive();
    container.addEventListener("scroll", updateActive, { passive: true });
    return () => container.removeEventListener("scroll", updateActive);
  }, [currentStep, isSummaryStep, currentCompetencyStep]);

  // --- AI summary generation on summary step ---

  useEffect(() => {
    if (!isSummaryStep || !assessmentId || generatingSummary) return;

    // Summary exists and was generated from this exact data — nothing to do
    if (generatedSummary && summaryDataKey === assessmentFingerprint) return;

    // Data has changed (or first visit) — generate a fresh summary
    setGeneratingSummary(true);
    const generate = async () => {
      try {
        const summary = await generateAssessmentSummaryAction({
          memberId: memberId as Id<"teamMembers">,
          assessmentId,
          roleId: roleId ? (roleId as Id<"roles">) : undefined,
        });
        setGeneratedSummary(summary as GeneratedSummary);
        setSummaryDataKey(assessmentFingerprint);
      } catch (error) {
        console.error("Failed to generate AI assessment summary:", error);
        toast({ title: "AI Summary", description: "Could not generate AI summary. Static summary is still available.", variant: "default" });
      } finally {
        setGeneratingSummary(false);
      }
    };

    generate();
  }, [isSummaryStep, assessmentId, assessmentFingerprint]);

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
      setHoveredRating({});
      setShowUnratedWarning(false);
      setScrollTarget(null);
      setActiveSubId(null);
      setGeneratedSummary(null);
      setGeneratingSummary(false);
      setSummaryDataKey(null);
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
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
    } finally {
      setInitializing(false);
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
        setCurrentStep(competencySteps.length); // summary step
      } else {
        // Find first competency step with incomplete sub-competencies
        const firstIncomplete = competencySteps.findIndex((step) =>
          step.subCompetencies.some((sub) => {
            const data = loadedData[sub._id];
            return !data?.evaluations || Object.keys(data.evaluations).length === 0;
          })
        );
        setCurrentStep(firstIncomplete === -1 ? competencySteps.length : firstIncomplete);
      }
    } catch (error) {
      console.error("Error loading assessment:", error);
      toast({ title: "Error", description: "Failed to load assessment", variant: "destructive" });
    } finally {
      setInitializing(false);
    }
  };

  // --- Event handlers ---

  const handleEvaluationChange = (subCompetencyId: string, criterion: string, evaluation: string) => {
    const existingData = assessmentData[subCompetencyId];
    const level = existingData?.level || memberLevelKey;
    const newEvaluations = { ...(existingData?.evaluations || {}), [criterion]: evaluation };
    setAssessmentData(prev => ({
      ...prev,
      [subCompetencyId]: { level, notes: existingData?.notes, evaluations: newEvaluations },
    }));
  };

  const handleNotesChange = (subCompetencyId: string, notes: string) => {
    const existingData = assessmentData[subCompetencyId];
    const level = existingData?.level || memberLevelKey;
    setAssessmentData(prev => ({
      ...prev,
      [subCompetencyId]: { level, notes, evaluations: existingData?.evaluations },
    }));
  };

  const handleDotNavigate = (step: number, subId?: string) => {
    flushSave();
    const sameStep = step === currentStep;
    setCurrentStep(step);
    setHoveredRating({});
    setShowUnratedWarning(false);
    if (subId && sameStep) {
      const el = document.getElementById(`sub-${subId}`);
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    } else if (!sameStep) {
      setScrollTarget(subId ?? "__top__");
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      // Check for unrated criteria
      const unratedCount = getUnratedCount();
      if (unratedCount > 0 && !showUnratedWarning) {
        setShowUnratedWarning(true);
        return;
      }

      // Fill defaults for unrated criteria if proceeding past warning
      if (currentCompetencyStep) {
        let dataChanged = false;
        const newData = { ...assessmentData };
        for (const sub of currentCompetencyStep.subCompetencies) {
          const criteria = getCriteriaForLevelWithFallback(sub, memberLevelKey);
          const currentEvals = newData[sub._id]?.evaluations || {};
          const hasUnevaluated = criteria.some(c => !currentEvals[c]);
          if (hasUnevaluated) {
            const updatedEvals = { ...currentEvals };
            criteria.forEach(c => { if (!updatedEvals[c]) updatedEvals[c] = "target"; });
            newData[sub._id] = {
              level: newData[sub._id]?.level || memberLevelKey,
              notes: newData[sub._id]?.notes,
              evaluations: updatedEvals,
            };
            dataChanged = true;
          }
        }
        if (dataChanged) {
          setAssessmentData(newData);
          assessmentDataRef.current = newData;
        }
      }

      await flushCurrentProgress();
      setCurrentStep(currentStep + 1);
      setScrollTarget("__top__");
      setHoveredRating({});
      setShowUnratedWarning(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setScrollTarget("__top__");
      setHoveredRating({});
      setShowUnratedWarning(false);
    }
  };

  const handleComplete = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      await flushCurrentProgress();
      const evalScores: Record<string, number> = {
        well_above: 5, above: 4, target: 3, below: 2, well_below: 1,
      };
      let totalScore = 0;
      let totalEvals = 0;
      for (const data of Object.values(assessmentData)) {
        if (data.evaluations) {
          for (const evaluation of Object.values(data.evaluations)) {
            if (evaluation && evalScores[evaluation] != null) {
              totalScore += evalScores[evaluation];
              totalEvals++;
            }
          }
        }
      }
      const overallScore = totalEvals > 0 ? totalScore / totalEvals : 0;

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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0">
        {/* Gradient top border */}
        <div className="h-1 bg-gradient-knak shrink-0" />

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-3 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-xl">Team Assessment — {memberName}</DialogTitle>
              {!initializing && !isSummaryStep && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Step {currentStep + 1} of {totalSteps}{currentCompetencyStep ? ` — ${currentCompetencyStep.competency.title}` : ""}
                </span>
              )}
            </div>
          </DialogHeader>
          {!initializing && (
            <WizardNavigationRail
              categories={navCategories}
              questions={navQuestions}
              responses={navResponses}
              currentStep={currentStep}
              activeSubId={activeSubId}
              onNavigate={handleDotNavigate}
              isSummaryStep={isSummaryStep}
            />
          )}
        </div>

        {/* Scrollable body */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
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
              aiSummary={generatedSummary}
              aiSummaryLoading={generatingSummary}
            />
          ) : currentCompetencyStep ? (
            <div key={currentStep} className="animate-fade-up space-y-6">
              {/* Sub-competency sections */}
              {currentCompetencyStep.subCompetencies.map((sub) => {
                const subData = assessmentData[sub._id];
                const criteria = getCriteriaForLevelWithFallback(sub, memberLevelKey);

                return (
                  <div key={sub._id} id={`sub-${sub._id}`} className="space-y-4">
                    {/* Sub-competency heading */}
                    <div className="border-b border-border/50 pb-2">
                      <p className="text-base font-medium">{sub.title}</p>
                    </div>

                    {/* Per-criterion blocks */}
                    {criteria.length > 0 && (
                      <div className="space-y-4">
                        {criteria.map((criterion, index) => {
                          const currentEvaluation = subData?.evaluations?.[criterion] || null;
                          const activeRating = hoveredRating[`${sub._id}-${criterion}`] || currentEvaluation;
                          const hint = activeRating ? getHintForCriterion(sub, index, activeRating) : "";

                          return (
                            <div key={index} className="space-y-1.5">
                              {/* Static criterion text */}
                              <p className="text-sm font-medium">{criterion}</p>

                              {/* Rating tabs */}
                              <Tabs
                                value={currentEvaluation || ""}
                                onValueChange={(value) => handleEvaluationChange(sub._id, criterion, value)}
                                className="w-full"
                              >
                                <TabsList className="grid w-full grid-cols-5 bg-muted/60 border border-border/50">
                                  {RATING_OPTIONS.map((opt) => (
                                    <TabsTrigger
                                      key={opt.value}
                                      value={opt.value}
                                      className={cn(
                                        "text-xs px-1",
                                        opt.colorClass,
                                        !currentEvaluation && "opacity-50",
                                      )}
                                      disabled={false}
                                      onMouseEnter={() =>
                                        setHoveredRating(prev => ({ ...prev, [`${sub._id}-${criterion}`]: opt.value }))
                                      }
                                      onMouseLeave={() =>
                                        setHoveredRating(prev => ({ ...prev, [`${sub._id}-${criterion}`]: null }))
                                      }
                                    >
                                      {opt.label}
                                    </TabsTrigger>
                                  ))}
                                </TabsList>
                              </Tabs>

                              {/* Hint line */}
                              <p className="text-xs text-muted-foreground min-h-4">
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
                        value={subData?.notes || ""}
                        onChange={(e) => handleNotesChange(sub._id, e.target.value)}
                        placeholder={`Notes for ${sub.title}...`}
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Unrated warning */}
        {showUnratedWarning && (
          <div className="shrink-0 mx-6 mb-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-200 flex-1">
              {getUnratedCount()} criteria not yet rated — they'll default to At Target.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowUnratedWarning(false)}>
                Go Back
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setShowUnratedWarning(false);
                // Force proceed by calling handleNext again (warning already shown)
                const proceed = async () => {
                  if (currentCompetencyStep) {
                    let dataChanged = false;
                    const newData = { ...assessmentData };
                    for (const sub of currentCompetencyStep.subCompetencies) {
                      const criteria = getCriteriaForLevelWithFallback(sub, memberLevelKey);
                      const currentEvals = newData[sub._id]?.evaluations || {};
                      const hasUnevaluated = criteria.some(c => !currentEvals[c]);
                      if (hasUnevaluated) {
                        const updatedEvals = { ...currentEvals };
                        criteria.forEach(c => { if (!updatedEvals[c]) updatedEvals[c] = "target"; });
                        newData[sub._id] = {
                          level: newData[sub._id]?.level || memberLevelKey,
                          notes: newData[sub._id]?.notes,
                          evaluations: updatedEvals,
                        };
                        dataChanged = true;
                      }
                    }
                    if (dataChanged) {
                      setAssessmentData(newData);
                      assessmentDataRef.current = newData;
                    }
                  }
                  await flushCurrentProgress();
                  setCurrentStep(prev => prev + 1);
                  setScrollTarget("__top__");
                  setHoveredRating({});
                };
                proceed();
              }}>
                Skip
              </Button>
            </div>
          </div>
        )}

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
                  {currentStep === competencySteps.length - 1 ? "Review" : "Next"}
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

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation, useConvex, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Check, Sparkles, Loader2 } from "lucide-react";
import { HiringCandidate, HiringStage } from "../HiringManagement";
import {
  getInterviewQuestionsForRole,
  getInterviewCategories,
  type InterviewQuestion,
} from "@/lib/interviewQuestions";
import { RATING_OPTIONS, RATING_SCORE_MAP } from "@/lib/ratingConstants";
import { WizardNavigationRail } from "./WizardNavigationRail";
import { WizardSummary } from "./WizardSummary";
import { CandidateAssessmentSummary } from "../CandidateAssessmentSummary";

interface ManagerInterviewWizardProps {
  open: boolean;
  onClose: () => void;
  candidate: HiringCandidate;
  existingAssessmentId?: string | null;
  stage?: HiringStage;
}

interface Response {
  questionIndex: number;
  responseNotes: string | null;
  rating: string | null;
}

export const ManagerInterviewWizard = ({
  open,
  onClose,
  candidate,
  existingAssessmentId,
  stage,
}: ManagerInterviewWizardProps) => {
  // Question source: AI-generated or hardcoded fallback
  const [aiQuestions, setAiQuestions] = useState<InterviewQuestion[] | null>(null);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  const FALLBACK_QUESTIONS = getInterviewQuestionsForRole(candidate.targetRole);

  // Use AI questions if available, otherwise fallback
  const INTERVIEW_QUESTIONS = aiQuestions || FALLBACK_QUESTIONS;
  const categories = getInterviewCategories(INTERVIEW_QUESTIONS);

  // Build category steps: one step per category, each containing its questions
  const categorySteps = useMemo(() => {
    return categories.map((cat) => ({
      category: cat,
      questions: INTERVIEW_QUESTIONS
        .map((q, i) => ({ origIdx: i, question: q }))
        .filter((item) => item.question.category === cat),
    }));
  }, [INTERVIEW_QUESTIONS, categories]);

  const totalSteps = categorySteps.length + 1; // +1 for summary

  const [currentStep, setCurrentStep] = useState(0); // category step index
  const [responses, setResponses] = useState<Record<number, Response>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [overallImpression, setOverallImpression] = useState("");
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<Record<number, string | null>>({});
  const [generatedSummary, setGeneratedSummary] = useState<any>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryDataKey, setSummaryDataKey] = useState<string | null>(null);
  const { toast } = useToast();

  // Scroll-linked navigation state
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const client = useConvex();
  const createDraftMutation = useMutation(api.candidateAssessments.createDraft);
  const completeMutation = useMutation(api.candidateAssessments.complete);
  const upsertResponse = useMutation(api.interviewResponses.upsert);
  const updateGeneratedQuestions = useMutation(api.candidateAssessments.updateGeneratedQuestions);
  const generateInterviewQuestions = useAction(api.ai.generateInterviewQuestions);
  const generateCandidateAssessmentSummary = useAction(api.ai.generateCandidateAssessmentSummary);

  const isSummaryStep = currentStep >= categorySteps.length;
  const currentCategoryStep = isSummaryStep ? null : categorySteps[currentStep];

  // Stable fingerprint of rating data for AI summary regeneration detection
  const assessmentFingerprint = useMemo(() =>
    categorySteps.flatMap((step) =>
      step.questions.map((q) => `${q.origIdx}:${responses[q.origIdx]?.rating || ""}`)
    ).join("|"),
    [responses, categorySteps]);

  // Determine the stage string and stageId for createDraft
  const stageString = stage ? stage._id : "manager_interview";
  const stageIdForDraft = stage ? (stage._id as Id<"hiringStages">) : undefined;

  // Determine the dialog title
  const dialogTitle = stage ? stage.title : "Manager Interview";

  // --- Scroll-tracking effect ---
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isSummaryStep || !currentCategoryStep) return;

    const qIds = currentCategoryStep.questions.map((q) => `q-${q.origIdx}`);
    if (qIds.length <= 1) {
      setActiveQuestionId(qIds[0] ?? null);
      return;
    }

    const updateActive = () => {
      const containerTop = container.getBoundingClientRect().top;
      let closest: string | null = null;
      let closestDist = Infinity;
      for (const id of qIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
        if (dist < closestDist) { closestDist = dist; closest = id; }
      }
      setActiveQuestionId(closest);
    };

    updateActive();
    container.addEventListener("scroll", updateActive, { passive: true });
    return () => container.removeEventListener("scroll", updateActive);
  }, [currentStep, isSummaryStep, currentCategoryStep]);

  // --- Scroll-target effect ---
  useEffect(() => {
    if (!scrollTarget) return;
    const target = scrollTarget;
    setScrollTarget(null);
    requestAnimationFrame(() => {
      if (target === "__top__") {
        scrollContainerRef.current?.scrollTo(0, 0);
      } else {
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
  }, [scrollTarget]);

  // --- Open/close effect ---
  useEffect(() => {
    if (open) {
      if (existingAssessmentId) {
        loadAssessment(existingAssessmentId);
      } else {
        createAssessment();
      }
    } else {
      setCurrentStep(0);
      setResponses({});
      setAssessmentId(null);
      setOverallImpression("");
      setHoveredRating({});
      setAiQuestions(null);
      setGeneratingQuestions(false);
      setGeneratedSummary(null);
      setGeneratingSummary(false);
      setSummaryDataKey(null);
      setActiveQuestionId(null);
      setScrollTarget(null);
    }
  }, [open, existingAssessmentId]);

  const createAssessment = async () => {
    setInitializing(true);
    try {
      const id = await createDraftMutation({
        candidateId: candidate._id as Id<"hiringCandidates">,
        stage: stageString,
        stageId: stageIdForDraft,
      });
      setAssessmentId(id);

      // Generate AI interview questions for this stage
      if (stage && candidate.roleId) {
        await generateAndStoreQuestions(id, stage);
      }

      setInitializing(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to create assessment",
        variant: "destructive",
      });
      onClose();
    }
  };

  const generateAndStoreQuestions = async (assessId: string, stageData: HiringStage) => {
    setGeneratingQuestions(true);
    try {
      const questions = await generateInterviewQuestions({
        stageId: stageData._id as Id<"hiringStages">,
        candidateId: candidate._id as Id<"hiringCandidates">,
        roleId: stageData.roleId as Id<"roles">,
      });

      // Store on the assessment record
      await updateGeneratedQuestions({
        id: assessId as Id<"candidateAssessments">,
        generatedQuestions: questions,
      });

      setAiQuestions(questions);
    } catch (error) {
      console.error("Failed to generate AI questions:", error);
      toast({
        title: "AI generation failed",
        description: "Using default interview questions instead.",
        variant: "destructive",
      });
      // Fallback to hardcoded questions — aiQuestions stays null
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const loadAssessment = async (id: string) => {
    setInitializing(true);
    setAssessmentId(id);

    try {
      const [data, assessment] = await Promise.all([
        client.query(api.interviewResponses.listForAssessment, {
          assessmentId: id as Id<"candidateAssessments">,
        }),
        client.query(api.candidateAssessments.getById, {
          id: id as Id<"candidateAssessments">,
        }),
      ]);

      // Load stored AI questions if available
      if (assessment?.generatedQuestions && assessment.generatedQuestions.length > 0) {
        setAiQuestions(assessment.generatedQuestions as InterviewQuestion[]);
      }

      const responseMap: Record<number, Response> = {};
      (data || []).forEach((r: any) => {
        responseMap[r.questionIndex] = {
          questionIndex: r.questionIndex,
          responseNotes: r.responseNotes ?? null,
          rating: r.rating ?? null,
        };
      });

      setResponses(responseMap);
      if (assessment?.notes) {
        setOverallImpression(assessment.notes);
      }

      // Navigate to furthest completion point — find first category with an unrated question
      const loadedQuestions = (assessment?.generatedQuestions?.length > 0
        ? assessment.generatedQuestions as InterviewQuestion[]
        : FALLBACK_QUESTIONS);
      const localCategories = getInterviewCategories(loadedQuestions);
      const localCategorySteps = localCategories.map((cat) => ({
        category: cat,
        questions: loadedQuestions
          .map((q, i) => ({ origIdx: i, question: q }))
          .filter((item) => item.question.category === cat),
      }));

      if (assessment?.status === "completed") {
        setCurrentStep(localCategorySteps.length); // summary step
      } else {
        const firstUnratedCategoryIdx = localCategorySteps.findIndex((step) =>
          step.questions.some((q) => !responseMap[q.origIdx]?.rating)
        );
        setCurrentStep(firstUnratedCategoryIdx === -1 ? localCategorySteps.length : firstUnratedCategoryIdx);
      }

      setInitializing(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load responses",
        variant: "destructive",
      });
      setInitializing(false);
    }
  };

  const saveResponse = async (questionIndex: number, notes: string, rating: string | null) => {
    if (!assessmentId) return;

    try {
      await upsertResponse({
        assessmentId: assessmentId as Id<"candidateAssessments">,
        candidateId: candidate._id as Id<"hiringCandidates">,
        questionIndex,
        questionText: INTERVIEW_QUESTIONS[questionIndex].question,
        responseNotes: notes,
        rating: rating ?? undefined,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save response",
        variant: "destructive",
      });
    }
  };

  const flushAllDirtyResponses = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (dirtyRef.current.size === 0) return;
    const toFlush = Array.from(dirtyRef.current);
    dirtyRef.current.clear();
    await Promise.all(
      toFlush.map((origIdx) => {
        const r = responsesRef.current[origIdx];
        if (r) return saveResponse(origIdx, r.responseNotes || "", r.rating);
      })
    );
  };

  // Called by nav rail dots — supports same-step scrolling and cross-step navigation
  const handleDotNavigate = async (step: number, subId?: string) => {
    await flushAllDirtyResponses();
    const sameStep = step === currentStep;
    setCurrentStep(step);
    setHoveredRating({});
    if (subId && sameStep) {
      const el = document.getElementById(subId);
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    } else if (!sameStep) {
      setScrollTarget(subId ?? "__top__");
    }
  };

  // handleNavigate for summary onNavigate — maps flat question index to category step
  const handleNavigate = async (flatIdx: number) => {
    // Find which category step this flat index belongs to
    let count = 0;
    for (let stepIdx = 0; stepIdx < categorySteps.length; stepIdx++) {
      const step = categorySteps[stepIdx];
      if (flatIdx < count + step.questions.length) {
        const questionInStep = step.questions[flatIdx - count];
        const subId = questionInStep ? `q-${questionInStep.origIdx}` : undefined;
        await handleDotNavigate(stepIdx, subId);
        return;
      }
      count += step.questions.length;
    }
    // If beyond all questions, go to summary
    await handleDotNavigate(categorySteps.length);
  };

  const handleNext = async () => {
    await flushAllDirtyResponses();
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setScrollTarget("__top__");
      setHoveredRating({});
    }
  };

  const handleBack = async () => {
    await flushAllDirtyResponses();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setScrollTarget("__top__");
      setHoveredRating({});
    }
  };

  const handleComplete = async () => {
    if (!assessmentId) return;

    const ratedCount = Object.values(responses).filter((r) => r.rating).length;
    const pct = ratedCount / INTERVIEW_QUESTIONS.length;
    if (pct < 0.8 && !showIncompleteWarning) {
      setShowIncompleteWarning(true);
      return;
    }
    setShowIncompleteWarning(false);

    await flushAllDirtyResponses();

    let totalScore = 0;
    let scored = 0;
    Object.values(responses).forEach((r) => {
      if (r.rating && RATING_SCORE_MAP[r.rating]) {
        totalScore += RATING_SCORE_MAP[r.rating];
        scored++;
      }
    });

    const overallScore = scored > 0 ? totalScore / scored : undefined;

    try {
      await completeMutation({
        id: assessmentId as Id<"candidateAssessments">,
        overallScore,
        notes: overallImpression || undefined,
      });

      toast({
        title: "Success",
        description: "Interview assessment completed",
      });

      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to complete assessment",
        variant: "destructive",
      });
    }
  };

  const updateResponse = (origIdx: number, field: "responseNotes" | "rating", value: string) => {
    if (isSummaryStep) return;
    setResponses((prev) => ({
      ...prev,
      [origIdx]: {
        ...prev[origIdx],
        questionIndex: origIdx,
        [field]: value,
      },
    }));
    dirtyRef.current.add(origIdx);
  };

  // Debounced auto-save
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsesRef = useRef(responses);
  const currentStepRef = useRef(currentStep);
  const categoryStepsRef = useRef(categorySteps);
  const dirtyRef = useRef<Set<number>>(new Set());
  responsesRef.current = responses;
  currentStepRef.current = currentStep;
  categoryStepsRef.current = categorySteps;

  const flushSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const step = categoryStepsRef.current[currentStepRef.current];
    if (!step) return;
    for (const q of step.questions) {
      const r = responsesRef.current[q.origIdx];
      if (r && assessmentId) {
        saveResponse(q.origIdx, r.responseNotes || "", r.rating);
      }
    }
    dirtyRef.current.clear();
  }, [assessmentId, categorySteps]);

  // Debounced auto-save when responses change
  useEffect(() => {
    if (isSummaryStep || !currentCategoryStep || !assessmentId) return;
    if (dirtyRef.current.size === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const step = categoryStepsRef.current[currentStepRef.current];
      if (!step) return;
      for (const origIdx of dirtyRef.current) {
        const r = responsesRef.current[origIdx];
        if (r) saveResponse(origIdx, r.responseNotes || "", r.rating);
      }
      dirtyRef.current.clear();
      debounceRef.current = null;
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [responses, assessmentId, isSummaryStep, currentCategoryStep]);

  // Flush on close
  useEffect(() => {
    return () => { flushSave(); };
  }, [flushSave]);

  // AI summary generation on summary step
  useEffect(() => {
    if (!isSummaryStep || !assessmentId || generatingSummary) return;
    if (generatedSummary && summaryDataKey === assessmentFingerprint) return;

    setGeneratingSummary(true);
    const generate = async () => {
      try {
        await flushAllDirtyResponses();
        const summary = await generateCandidateAssessmentSummary({
          assessmentId: assessmentId as Id<"candidateAssessments">,
          candidateId: candidate._id as Id<"hiringCandidates">,
        });
        setGeneratedSummary(summary);
        setSummaryDataKey(assessmentFingerprint);
      } catch (error) {
        console.error("Failed to generate AI assessment summary:", error);
        toast({ title: "AI Summary", description: "Could not generate AI summary. Manual summary is still available.", variant: "default" });
      } finally {
        setGeneratingSummary(false);
      }
    };
    generate();
  }, [isSummaryStep, assessmentId, assessmentFingerprint]);

  // Default all unrated questions in the current category to "target" rating
  useEffect(() => {
    if (isSummaryStep || !currentCategoryStep || generatingQuestions) return;
    setResponses((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const q of currentCategoryStep.questions) {
        if (!next[q.origIdx]) {
          next[q.origIdx] = { questionIndex: q.origIdx, responseNotes: null, rating: "target" };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentStep, isSummaryStep, currentCategoryStep, generatingQuestions]);

  // Build nav rail data: flat list with stepIndex and subId per question
  const navQuestions = categorySteps.flatMap((step, stepIdx) =>
    step.questions.map((q) => ({
      category: step.category,
      stepIndex: stepIdx,
      subId: `q-${q.origIdx}`,
    }))
  );
  const navResponses: Record<number, { rating: string | null; notes: string | null }> = {};
  let flatIdx = 0;
  for (const step of categorySteps) {
    for (const q of step.questions) {
      const r = responses[q.origIdx];
      if (r) {
        navResponses[flatIdx] = { rating: r.rating, notes: r.responseNotes };
      }
      flatIdx++;
    }
  }

  // Build summary data in flat question order across all categories
  const summaryQuestions = categorySteps.flatMap((step) =>
    step.questions.map((q) => ({
      category: step.category,
      label: q.question.question.length > 80
        ? q.question.question.slice(0, 77) + "..."
        : q.question.question,
    }))
  );
  const summaryResponses: Record<number, { rating: string | null; notes: string | null }> = {};
  let summaryFlatIdx = 0;
  for (const step of categorySteps) {
    for (const q of step.questions) {
      const r = responses[q.origIdx];
      if (r) {
        summaryResponses[summaryFlatIdx] = { rating: r.rating, notes: r.responseNotes };
      }
      summaryFlatIdx++;
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0">
          {/* Gradient top border */}
          <div className="h-1 bg-gradient-knak shrink-0" />

          {/* Header */}
          <div className="shrink-0 px-6 pt-4 pb-3 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {dialogTitle} — {candidate.name}
                </span>
              </DialogTitle>
            </DialogHeader>
            {!initializing && !generatingQuestions && (
              <WizardNavigationRail
                categories={categories}
                questions={navQuestions}
                responses={navResponses}
                currentStep={currentStep}
                activeSubId={activeQuestionId}
                onNavigate={handleDotNavigate}
                isSummaryStep={isSummaryStep}
              />
            )}
          </div>

          {/* Category header (outside scroll container — stays fixed for the step) */}
          {!initializing && !generatingQuestions && !isSummaryStep && currentCategoryStep && (
            <div className="shrink-0 px-6 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {currentCategoryStep.category}
              </p>
            </div>
          )}

          {/* Scrollable body */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
            {initializing || generatingQuestions ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                {generatingQuestions ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                    <p className="text-sm">Generating interview questions...</p>
                    <p className="text-xs text-muted-foreground/60">
                      AI is crafting questions tailored to this stage and the candidate's target level.
                    </p>
                  </>
                ) : (
                  <p>Loading...</p>
                )}
              </div>
            ) : isSummaryStep ? (
              <div className="space-y-6">
                <WizardSummary
                  categories={categories}
                  questions={summaryQuestions}
                  responses={summaryResponses}
                  onNavigate={handleNavigate}
                  overallImpression={overallImpression}
                  onOverallImpressionChange={setOverallImpression}
                />
                <CandidateAssessmentSummary aiSummary={generatedSummary} aiSummaryLoading={generatingSummary} />
              </div>
            ) : currentCategoryStep ? (
              <div key={currentStep} className="animate-fade-up">
                {currentCategoryStep.questions.map((item) => {
                  const resp = responses[item.origIdx] || { rating: "target", responseNotes: "" };
                  const activeRatingValue = hoveredRating[item.origIdx] || resp.rating;
                  const activeHint = activeRatingValue
                    ? RATING_OPTIONS.find((o) => o.value === activeRatingValue)?.hint
                    : null;
                  return (
                    <div key={item.origIdx} id={`q-${item.origIdx}`} className="space-y-4 pb-8">
                      {/* Question */}
                      <p className="text-lg font-medium">
                        {item.question.question}
                      </p>

                      {/* Rating tabs */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Rating</label>
                        <Tabs
                          value={resp.rating || ""}
                          onValueChange={(value) => updateResponse(item.origIdx, "rating", value)}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-5">
                            {RATING_OPTIONS.map((opt) => (
                              <TabsTrigger
                                key={opt.value}
                                value={opt.value}
                                className={`text-xs px-1 ${opt.colorClass}`}
                                onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [item.origIdx]: opt.value }))}
                                onMouseLeave={() => setHoveredRating(prev => ({ ...prev, [item.origIdx]: null }))}
                              >
                                {opt.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                        <p className="text-xs text-muted-foreground h-4">
                          {activeHint ?? "\u00A0"}
                        </p>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Notes</label>
                        <Textarea
                          placeholder={item.question.signal || "Enter observations and notes about the candidate's response..."}
                          value={resp.responseNotes || ""}
                          onChange={(e) => updateResponse(item.origIdx, "responseNotes", e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {!initializing && !generatingQuestions && (
            <div className="shrink-0 px-6 pt-3 pb-4 border-t">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {isSummaryStep ? (
                  <Button onClick={handleComplete} className="gap-2">
                    <Check className="h-4 w-4" />
                    Complete Assessment
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    {currentStep === categorySteps.length - 1 ? "Review" : "Next"}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Incomplete warning dialog */}
      <AlertDialog open={showIncompleteWarning} onOpenChange={setShowIncompleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Less than 80% of questions have been rated. Are you sure you want to complete this assessment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              Complete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

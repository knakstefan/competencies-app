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

  // Build display order: group original indices by category
  const displayOrder = useMemo(() => {
    const order: number[] = [];
    for (const cat of categories) {
      INTERVIEW_QUESTIONS.forEach((q, i) => {
        if (q.category === cat) order.push(i);
      });
    }
    return order;
  }, [INTERVIEW_QUESTIONS, categories]);

  // Reverse map: original index → display step
  const originalToDisplay = useMemo(() => {
    const map: Record<number, number> = {};
    displayOrder.forEach((origIdx, displayIdx) => {
      map[origIdx] = displayIdx;
    });
    return map;
  }, [displayOrder]);

  const totalSteps = INTERVIEW_QUESTIONS.length + 1; // +1 for summary

  const [currentStep, setCurrentStep] = useState(0); // display step
  const [responses, setResponses] = useState<Record<number, Response>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [overallImpression, setOverallImpression] = useState("");
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<string | null>(null);
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.candidateAssessments.createDraft);
  const completeMutation = useMutation(api.candidateAssessments.complete);
  const upsertResponse = useMutation(api.interviewResponses.upsert);
  const updateGeneratedQuestions = useMutation(api.candidateAssessments.updateGeneratedQuestions);
  const generateInterviewQuestions = useAction(api.ai.generateInterviewQuestions);

  const isSummaryStep = currentStep === INTERVIEW_QUESTIONS.length;

  // Current original question index (only valid when not on summary)
  const origIdx = isSummaryStep ? -1 : displayOrder[currentStep];

  // Determine the stage string and stageId for createDraft
  const stageString = stage ? stage._id : "manager_interview";
  const stageIdForDraft = stage ? (stage._id as Id<"hiringStages">) : undefined;

  // Determine the dialog title
  const dialogTitle = stage ? stage.title : "Manager Interview";

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
      setHoveredRating(null);
      setAiQuestions(null);
      setGeneratingQuestions(false);
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

      // Navigate to furthest completion point
      const loadedQuestions = (assessment?.generatedQuestions?.length > 0
        ? assessment.generatedQuestions as InterviewQuestion[]
        : FALLBACK_QUESTIONS);
      const localCategories = getInterviewCategories(loadedQuestions);
      const localDisplayOrder: number[] = [];
      for (const cat of localCategories) {
        loadedQuestions.forEach((q, i) => {
          if (q.category === cat) localDisplayOrder.push(i);
        });
      }

      if (assessment?.status === "completed") {
        setCurrentStep(loadedQuestions.length); // summary step
      } else {
        const firstUnrated = localDisplayOrder.findIndex(
          origIdx => !responseMap[origIdx]?.rating
        );
        setCurrentStep(firstUnrated === -1 ? loadedQuestions.length : firstUnrated);
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

  const flushCurrentResponse = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const step = currentStepRef.current;
    if (step < INTERVIEW_QUESTIONS.length) {
      const oIdx = displayOrder[step];
      const currentResp = responsesRef.current[oIdx];
      if (currentResp) {
        await saveResponse(oIdx, currentResp.responseNotes || "", currentResp.rating);
      }
    }
  };

  // handleNavigate accepts a display step
  const handleNavigate = async (targetDisplayStep: number) => {
    if (targetDisplayStep < 0 || targetDisplayStep >= totalSteps) return;
    await flushCurrentResponse();
    setCurrentStep(targetDisplayStep);
    setHoveredRating(null);
  };

  // Called by nav rail dots — they pass display indices
  const handleDotNavigate = async (displayIdx: number) => {
    await handleNavigate(displayIdx);
  };

  const handleNext = async () => {
    await flushCurrentResponse();
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setHoveredRating(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setHoveredRating(null);
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

    await flushCurrentResponse();

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

  const updateResponse = (field: "responseNotes" | "rating", value: string) => {
    if (isSummaryStep) return;
    setResponses((prev) => ({
      ...prev,
      [origIdx]: {
        ...prev[origIdx],
        questionIndex: origIdx,
        [field]: value,
      },
    }));
  };

  // Debounced auto-save
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsesRef = useRef(responses);
  const currentStepRef = useRef(currentStep);
  responsesRef.current = responses;
  currentStepRef.current = currentStep;

  const flushSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const step = currentStepRef.current;
    if (step < INTERVIEW_QUESTIONS.length) {
      const oIdx = displayOrder[step];
      const r = responsesRef.current[oIdx];
      if (r && assessmentId) {
        saveResponse(oIdx, r.responseNotes || "", r.rating);
      }
    }
  }, [assessmentId, displayOrder]);

  useEffect(() => {
    if (isSummaryStep) return;
    const r = responses[origIdx];
    if (!r || !assessmentId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveResponse(origIdx, r.responseNotes || "", r.rating);
      debounceRef.current = null;
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [responses, origIdx, assessmentId, isSummaryStep]);

  // Flush on close
  useEffect(() => {
    return () => { flushSave(); };
  }, [flushSave]);

  // Default new questions to "target" rating
  if (!isSummaryStep && !generatingQuestions && INTERVIEW_QUESTIONS.length > 0 && origIdx >= 0 && !responses[origIdx]) {
    setResponses((prev) => ({
      ...prev,
      [origIdx]: {
        questionIndex: origIdx,
        responseNotes: null,
        rating: "target",
      },
    }));
  }

  const currentResponse = responses[origIdx] || {
    questionIndex: origIdx,
    responseNotes: "",
    rating: "target",
  };

  const currentQuestion: InterviewQuestion | undefined = INTERVIEW_QUESTIONS[origIdx];

  // Find the hint to display: hovered rating or selected rating
  const activeRatingValue = hoveredRating || currentResponse.rating;
  const activeHint = activeRatingValue
    ? RATING_OPTIONS.find((o) => o.value === activeRatingValue)?.hint
    : null;

  // Current category for dialog title
  const currentCategory = isSummaryStep
    ? "Review"
    : currentQuestion?.category ?? "";

  // Build nav rail data in display order.
  const navQuestions = displayOrder.map((oIdx) => ({
    category: INTERVIEW_QUESTIONS[oIdx].category,
  }));
  const navResponses: Record<number, { rating: string | null; notes: string | null }> = {};
  displayOrder.forEach((oIdx, displayIdx) => {
    const r = responses[oIdx];
    if (r) {
      navResponses[displayIdx] = { rating: r.rating, notes: r.responseNotes };
    }
  });

  // Build summary data in display order
  const summaryQuestions = displayOrder.map((oIdx) => {
    const q = INTERVIEW_QUESTIONS[oIdx];
    return {
      category: q.category,
      label: q.question.length > 80 ? q.question.slice(0, 77) + "..." : q.question,
    };
  });
  const summaryResponses: Record<number, { rating: string | null; notes: string | null }> = {};
  displayOrder.forEach((oIdx, displayIdx) => {
    const r = responses[oIdx];
    if (r) {
      summaryResponses[displayIdx] = { rating: r.rating, notes: r.responseNotes };
    }
  });

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
                onNavigate={handleDotNavigate}
                isSummaryStep={isSummaryStep}
              />
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
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
              <WizardSummary
                categories={categories}
                questions={summaryQuestions}
                responses={summaryResponses}
                onNavigate={handleNavigate}
                overallImpression={overallImpression}
                onOverallImpressionChange={setOverallImpression}
              />
            ) : (
              <div key={currentStep} className="animate-fade-up space-y-4">
                {/* Category header */}
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {currentQuestion.category}
                </p>

                {/* Question */}
                <p className="text-lg font-medium">
                  {currentQuestion.question}
                </p>

                {/* Rating tabs */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Rating</label>
                  <Tabs
                    value={currentResponse.rating || ""}
                    onValueChange={(value) => updateResponse("rating", value)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-5">
                      {RATING_OPTIONS.map((opt) => (
                        <TabsTrigger
                          key={opt.value}
                          value={opt.value}
                          className={`text-xs px-1 ${opt.colorClass}`}
                          onMouseEnter={() => setHoveredRating(opt.value)}
                          onMouseLeave={() => setHoveredRating(null)}
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
                    placeholder={currentQuestion.signal || "Enter observations and notes about the candidate's response..."}
                    value={currentResponse.responseNotes || ""}
                    onChange={(e) => updateResponse("responseNotes", e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
            )}
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
                    {currentStep === INTERVIEW_QUESTIONS.length - 1 ? "Review" : "Next"}
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

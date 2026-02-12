import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useConvex } from "convex/react";
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
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { HiringCandidate } from "../HiringManagement";
import {
  getPortfolioQuestionsForRole,
  getPortfolioCategories,
  type PortfolioQuestion,
} from "@/lib/interviewQuestions";
import { RATING_OPTIONS, RATING_SCORE_MAP } from "@/lib/ratingConstants";
import { WizardNavigationRail } from "./WizardNavigationRail";
import { WizardSummary } from "./WizardSummary";

interface PortfolioReviewWizardProps {
  open: boolean;
  onClose: () => void;
  candidate: HiringCandidate;
  existingAssessmentId?: string | null;
}

interface Response {
  questionIndex: number;
  responseNotes: string | null;
  competencyLevel: string | null;
}

export const PortfolioReviewWizard = ({
  open,
  onClose,
  candidate,
  existingAssessmentId,
}: PortfolioReviewWizardProps) => {
  const PORTFOLIO_QUESTIONS = getPortfolioQuestionsForRole(candidate.targetRole);
  const categories = getPortfolioCategories(PORTFOLIO_QUESTIONS);
  const totalSteps = PORTFOLIO_QUESTIONS.length + 1; // +1 for summary

  const [currentStep, setCurrentStep] = useState(0);
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
  const upsertResponse = useMutation(api.portfolioResponses.upsert);

  const isSummaryStep = currentStep === PORTFOLIO_QUESTIONS.length;

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
    }
  }, [open, existingAssessmentId]);

  const createAssessment = async () => {
    setInitializing(true);
    try {
      const id = await createDraftMutation({
        candidateId: candidate._id as Id<"hiringCandidates">,
        stage: "portfolio_review",
      });
      setAssessmentId(id);
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

  const loadAssessment = async (id: string) => {
    setInitializing(true);
    setAssessmentId(id);

    try {
      const [data, assessment] = await Promise.all([
        client.query(api.portfolioResponses.listForAssessment, {
          assessmentId: id as Id<"candidateAssessments">,
        }),
        client.query(api.candidateAssessments.getById, {
          id: id as Id<"candidateAssessments">,
        }),
      ]);

      const responseMap: Record<number, Response> = {};
      (data || []).forEach((r: any) => {
        responseMap[r.questionIndex] = {
          questionIndex: r.questionIndex,
          responseNotes: r.responseNotes ?? null,
          competencyLevel: r.competencyLevel ?? null,
        };
      });

      setResponses(responseMap);
      if (assessment?.notes) {
        setOverallImpression(assessment.notes);
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

  const saveResponse = async (questionIndex: number, notes: string, level: string | null) => {
    if (!assessmentId) return;

    const question = PORTFOLIO_QUESTIONS[questionIndex];

    try {
      await upsertResponse({
        assessmentId: assessmentId as Id<"candidateAssessments">,
        candidateId: candidate._id as Id<"hiringCandidates">,
        questionIndex,
        competencyArea: question.competencyArea,
        subCompetencyTitle: question.subCompetencyTitle,
        questionText: question.question,
        responseNotes: notes,
        competencyLevel: level ?? undefined,
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
    if (step < PORTFOLIO_QUESTIONS.length) {
      const currentResp = responsesRef.current[step];
      if (currentResp) {
        await saveResponse(step, currentResp.responseNotes || "", currentResp.competencyLevel);
      }
    }
  };

  const handleNavigate = async (targetStep: number) => {
    if (targetStep < 0 || targetStep >= totalSteps) return;
    await flushCurrentResponse();
    setCurrentStep(targetStep);
    setHoveredRating(null);
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

    // Check completion percentage
    const ratedCount = Object.values(responses).filter((r) => r.competencyLevel).length;
    const pct = ratedCount / PORTFOLIO_QUESTIONS.length;
    if (pct < 0.8 && !showIncompleteWarning) {
      setShowIncompleteWarning(true);
      return;
    }
    setShowIncompleteWarning(false);

    await flushCurrentResponse();

    let totalScore = 0;
    let scored = 0;
    Object.values(responses).forEach((r) => {
      if (r.competencyLevel && RATING_SCORE_MAP[r.competencyLevel]) {
        totalScore += RATING_SCORE_MAP[r.competencyLevel];
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
        description: "Portfolio review assessment completed",
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

  const updateResponse = (field: "responseNotes" | "competencyLevel", value: string) => {
    setResponses((prev) => ({
      ...prev,
      [currentStep]: {
        ...prev[currentStep],
        questionIndex: currentStep,
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
    if (step < PORTFOLIO_QUESTIONS.length) {
      const r = responsesRef.current[step];
      if (r && assessmentId) {
        saveResponse(step, r.responseNotes || "", r.competencyLevel);
      }
    }
  }, [assessmentId]);

  useEffect(() => {
    if (isSummaryStep) return;
    const r = responses[currentStep];
    if (!r || !assessmentId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveResponse(currentStep, r.responseNotes || "", r.competencyLevel);
      debounceRef.current = null;
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [responses, currentStep, assessmentId, isSummaryStep]);

  // Flush on close
  useEffect(() => {
    return () => { flushSave(); };
  }, [flushSave]);

  // Default new questions to "target" level
  if (!isSummaryStep && !responses[currentStep]) {
    setResponses((prev) => ({
      ...prev,
      [currentStep]: {
        questionIndex: currentStep,
        responseNotes: null,
        competencyLevel: "target",
      },
    }));
  }

  const currentResponse = responses[currentStep] || {
    questionIndex: currentStep,
    responseNotes: "",
    competencyLevel: "target",
  };

  const currentQuestion: PortfolioQuestion | undefined = PORTFOLIO_QUESTIONS[currentStep];

  // Find the hint to display: hovered rating or selected rating
  const activeRatingValue = hoveredRating || currentResponse.competencyLevel;
  const activeHint = activeRatingValue
    ? RATING_OPTIONS.find((o) => o.value === activeRatingValue)?.hint
    : null;

  // Current category for dialog title
  const currentCategory = isSummaryStep
    ? "Review"
    : currentQuestion?.competencyArea ?? "";

  // Normalize responses for WizardNavigationRail (competencyLevel → rating)
  const navResponses: Record<number, { rating: string | null; notes: string | null }> = {};
  for (const [k, v] of Object.entries(responses)) {
    navResponses[Number(k)] = { rating: v.competencyLevel, notes: v.responseNotes };
  }

  // Map questions for nav rail (competencyArea → category)
  const navQuestions = PORTFOLIO_QUESTIONS.map((q) => ({ category: q.competencyArea }));

  // Map questions for WizardSummary
  const summaryQuestions = PORTFOLIO_QUESTIONS.map((q) => ({
    category: q.competencyArea,
    label: q.subCompetencyTitle,
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* Gradient top border */}
          <div className="h-1 bg-gradient-knak" />

          <div className="px-6 pt-4 pb-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  Portfolio Review — {candidate.name}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {currentCategory}
                </span>
              </DialogTitle>
            </DialogHeader>

            {initializing ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Navigation rail */}
                <WizardNavigationRail
                  categories={categories}
                  questions={navQuestions}
                  responses={navResponses}
                  currentStep={currentStep}
                  onNavigate={handleNavigate}
                  isSummaryStep={isSummaryStep}
                />

                {isSummaryStep ? (
                  <WizardSummary
                    categories={categories}
                    questions={summaryQuestions}
                    responses={navResponses}
                    onNavigate={handleNavigate}
                    overallImpression={overallImpression}
                    onOverallImpressionChange={setOverallImpression}
                  />
                ) : (
                  <div key={currentStep} className="animate-fade-up space-y-4">
                    {/* Competency Area Header */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {currentQuestion.competencyArea}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {currentQuestion.subCompetencyTitle}
                      </p>
                    </div>

                    {/* Question */}
                    <p className="text-lg font-medium">
                      {currentQuestion.question}
                    </p>

                    {/* Rating tabs */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Competency Level</label>
                      <Tabs
                        value={currentResponse.competencyLevel || ""}
                        onValueChange={(value) => updateResponse("competencyLevel", value)}
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
                        placeholder={`Observations about ${currentQuestion.subCompetencyTitle.toLowerCase()}...`}
                        value={currentResponse.responseNotes || ""}
                        onChange={(e) => updateResponse("responseNotes", e.target.value)}
                        rows={6}
                      />
                    </div>
                  </div>
                )}

                {/* Navigation */}
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
                      {currentStep === PORTFOLIO_QUESTIONS.length - 1 ? "Review" : "Next"}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
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

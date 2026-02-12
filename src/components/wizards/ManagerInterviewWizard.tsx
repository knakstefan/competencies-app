import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { HiringCandidate } from "../HiringManagement";
import { getInterviewQuestionsForRole } from "@/lib/interviewQuestions";

const RATING_OPTIONS = [
  { value: "well_above", label: "Well Above", hint: "Exceptional, exceeds all expectations for this level" },
  { value: "above", label: "Above", hint: "Consistently strong, exceeds most expectations" },
  { value: "target", label: "Target", hint: "Meets expectations for the target level" },
  { value: "below", label: "Below", hint: "Partially meets expectations, development needed" },
  { value: "well_below", label: "Well Below", hint: "Significant gaps, substantial development needed" },
];

interface ManagerInterviewWizardProps {
  open: boolean;
  onClose: () => void;
  candidate: HiringCandidate;
  existingAssessmentId?: string | null;
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
}: ManagerInterviewWizardProps) => {
  const INTERVIEW_QUESTIONS = getInterviewQuestionsForRole(candidate.targetRole);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, Response>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.candidateAssessments.createDraft);
  const completeMutation = useMutation(api.candidateAssessments.complete);
  const upsertResponse = useMutation(api.interviewResponses.upsert);

  useEffect(() => {
    if (open) {
      if (existingAssessmentId) {
        loadAssessment(existingAssessmentId);
      } else {
        createAssessment();
      }
    } else {
      // Reset state when closing
      setCurrentStep(0);
      setResponses({});
      setAssessmentId(null);
    }
  }, [open, existingAssessmentId]);

  const createAssessment = async () => {
    setInitializing(true);
    try {
      const id = await createDraftMutation({
        candidateId: candidate._id as Id<"hiringCandidates">,
        stage: "manager_interview",
      });

      setAssessmentId(id);
      setInitializing(false);
    } catch (error) {
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
      const data = await client.query(api.interviewResponses.listForAssessment, {
        assessmentId: id as Id<"candidateAssessments">,
      });

      const responseMap: Record<number, Response> = {};
      (data || []).forEach((r: any) => {
        responseMap[r.questionIndex] = {
          questionIndex: r.questionIndex,
          responseNotes: r.responseNotes ?? null,
          rating: r.rating ?? null,
        };
      });

      setResponses(responseMap);
      setInitializing(false);
    } catch (error) {
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
        questionText: INTERVIEW_QUESTIONS[questionIndex],
        responseNotes: notes,
        rating: rating ?? undefined,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save response",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    // Cancel pending debounce and save immediately
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const currentResp = responses[currentStep];
    if (currentResp) {
      await saveResponse(
        currentStep,
        currentResp.responseNotes || "",
        currentResp.rating
      );
    }

    if (currentStep < INTERVIEW_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!assessmentId) return;

    // Cancel pending debounce and save immediately
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const currentResp = responses[currentStep];
    if (currentResp) {
      await saveResponse(
        currentStep,
        currentResp.responseNotes || "",
        currentResp.rating
      );
    }

    // Calculate overall score based on ratings (5-point scale)
    const ratingScores: Record<string, number> = {
      well_above: 5,
      above: 4,
      target: 3,
      below: 2,
      well_below: 1,
    };

    let totalScore = 0;
    let ratedCount = 0;
    Object.values(responses).forEach((r) => {
      if (r.rating && ratingScores[r.rating]) {
        totalScore += ratingScores[r.rating];
        ratedCount++;
      }
    });

    const overallScore = ratedCount > 0 ? totalScore / ratedCount : undefined;

    try {
      await completeMutation({
        id: assessmentId as Id<"candidateAssessments">,
        overallScore,
      });

      toast({
        title: "Success",
        description: "Interview assessment completed",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete assessment",
        variant: "destructive",
      });
    }
  };

  const updateResponse = (field: "responseNotes" | "rating", value: string) => {
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
    const r = responsesRef.current[step];
    if (r && assessmentId) {
      saveResponse(step, r.responseNotes || "", r.rating);
    }
  }, [assessmentId]);

  useEffect(() => {
    const r = responses[currentStep];
    if (!r || !assessmentId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveResponse(currentStep, r.responseNotes || "", r.rating);
      debounceRef.current = null;
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [responses, currentStep, assessmentId]);

  // Flush on close
  useEffect(() => {
    return () => { flushSave(); };
  }, [flushSave]);

  const currentResponse = responses[currentStep] || {
    questionIndex: currentStep,
    responseNotes: "",
    rating: null,
  };

  const isLastStep = currentStep === INTERVIEW_QUESTIONS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manager Interview Assessment</DialogTitle>
        </DialogHeader>

        {initializing ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Question {currentStep + 1} of {INTERVIEW_QUESTIONS.length}
                </span>
                <span>
                  {Math.round(((currentStep + 1) / INTERVIEW_QUESTIONS.length) * 100)}%
                </span>
              </div>
              <Progress
                value={((currentStep + 1) / INTERVIEW_QUESTIONS.length) * 100}
              />
            </div>

            {/* Question */}
            <div className="space-y-4">
              <p className="text-lg font-medium">
                {INTERVIEW_QUESTIONS[currentStep]}
              </p>

              {/* Rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <Select
                  value={currentResponse.rating || ""}
                  onValueChange={(value) => updateResponse("rating", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rating..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{option.hint}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Enter observations and notes about the candidate's response..."
                  value={currentResponse.responseNotes || ""}
                  onChange={(e) => updateResponse("responseNotes", e.target.value)}
                  rows={6}
                />
              </div>
            </div>

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

              {isLastStep ? (
                <Button onClick={handleComplete} className="gap-2">
                  <Check className="h-4 w-4" />
                  Complete Assessment
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
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

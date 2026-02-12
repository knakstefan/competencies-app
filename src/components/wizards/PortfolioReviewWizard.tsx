import { useState, useEffect } from "react";
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

interface PortfolioQuestion {
  competencyArea: string;
  subCompetencyTitle: string;
  question: string;
}

const PORTFOLIO_QUESTIONS: PortfolioQuestion[] = [
  // Product Thinking & Prioritization
  {
    competencyArea: "Product Thinking & Prioritization",
    subCompetencyTitle: "Feature Definition & Prioritization",
    question: "Walk me through how you scoped and prioritized features in one of your portfolio projects. What tradeoffs did you make?",
  },
  {
    competencyArea: "Product Thinking & Prioritization",
    subCompetencyTitle: "Analytical Thinking & Problem Solving",
    question: "Can you describe the problem you were solving in this project? How did you validate that your solution addressed the core issue?",
  },
  // Visual, Interaction & Content Design
  {
    competencyArea: "Visual, Interaction & Content Design",
    subCompetencyTitle: "Interaction & Visual Design Execution",
    question: "Walk me through your design decisions for the visual and interaction patterns in this project. How did you ensure consistency?",
  },
  {
    competencyArea: "Visual, Interaction & Content Design",
    subCompetencyTitle: "Information Architecture & Content Design",
    question: "How did you structure the information and content in this experience? What principles guided your decisions?",
  },
  {
    competencyArea: "Visual, Interaction & Content Design",
    subCompetencyTitle: "Accessibility & Inclusive Design",
    question: "What accessibility considerations did you incorporate into this design? How did you validate it works for diverse users?",
  },
  // Communication & Collaboration
  {
    competencyArea: "Communication & Collaboration",
    subCompetencyTitle: "Agile Practices & Cross-Functional Collaboration",
    question: "How did you work with engineering and product teams on this project? What was your collaboration process?",
  },
  {
    competencyArea: "Communication & Collaboration",
    subCompetencyTitle: "Workshop Facilitation & Design Critique",
    question: "How did you gather and incorporate feedback during this project? Did you facilitate any sessions with stakeholders?",
  },
  {
    competencyArea: "Communication & Collaboration",
    subCompetencyTitle: "Emotional Intelligence & Feedback",
    question: "Tell me about a challenging conversation or difficult feedback you received on this project. How did you respond?",
  },
];

const COMPETENCY_LEVELS = [
  { value: "well_above", label: "Well Above" },
  { value: "above", label: "Above" },
  { value: "target", label: "Target" },
  { value: "below", label: "Below" },
  { value: "well_below", label: "Well Below" },
];

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
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, Response>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.candidateAssessments.createDraft);
  const completeMutation = useMutation(api.candidateAssessments.complete);
  const upsertResponse = useMutation(api.portfolioResponses.upsert);

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
        stage: "portfolio_review",
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
      const data = await client.query(api.portfolioResponses.listForAssessment, {
        assessmentId: id as Id<"candidateAssessments">,
      });

      const responseMap: Record<number, Response> = {};
      (data || []).forEach((r: any) => {
        responseMap[r.questionIndex] = {
          questionIndex: r.questionIndex,
          responseNotes: r.responseNotes ?? null,
          competencyLevel: r.competencyLevel ?? null,
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save response",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    const currentResponse = responses[currentStep];
    if (currentResponse) {
      await saveResponse(
        currentStep,
        currentResponse.responseNotes || "",
        currentResponse.competencyLevel
      );
    }

    if (currentStep < PORTFOLIO_QUESTIONS.length - 1) {
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

    // Save current response first
    const currentResponse = responses[currentStep];
    if (currentResponse) {
      await saveResponse(
        currentStep,
        currentResponse.responseNotes || "",
        currentResponse.competencyLevel
      );
    }

    // Calculate overall score based on competency levels (1-5 scale)
    const levelScores: Record<string, number> = {
      well_below: 1,
      below: 2,
      target: 3,
      above: 4,
      well_above: 5,
    };

    let totalScore = 0;
    let ratedCount = 0;
    Object.values(responses).forEach((r) => {
      if (r.competencyLevel && levelScores[r.competencyLevel]) {
        totalScore += levelScores[r.competencyLevel];
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
        description: "Portfolio review assessment completed",
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

  const currentResponse = responses[currentStep] || {
    questionIndex: currentStep,
    responseNotes: "",
    competencyLevel: null,
  };

  const currentQuestion = PORTFOLIO_QUESTIONS[currentStep];
  const isLastStep = currentStep === PORTFOLIO_QUESTIONS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Portfolio Review Assessment</DialogTitle>
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
                  Question {currentStep + 1} of {PORTFOLIO_QUESTIONS.length}
                </span>
                <span>
                  {Math.round(((currentStep + 1) / PORTFOLIO_QUESTIONS.length) * 100)}%
                </span>
              </div>
              <Progress
                value={((currentStep + 1) / PORTFOLIO_QUESTIONS.length) * 100}
              />
            </div>

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
            <div className="space-y-4">
              <p className="text-lg font-medium">
                {currentQuestion.question}
              </p>

              {/* Competency Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Competency Level</label>
                <Select
                  value={currentResponse.competencyLevel || ""}
                  onValueChange={(value) => updateResponse("competencyLevel", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETENCY_LEVELS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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

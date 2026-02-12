import { useState } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, Check } from "lucide-react";
import { HiringCandidate } from "./HiringManagement";
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

const INTERVIEW_QUESTIONS = [
  "Can you summarize your background and experience and what makes you excited for the opportunity?",
  "What were your first impressions after the interview with the recruiter?",
  "When you think about the favorite team you've been apart of, what did you like most?",
  "What did you dislike?",
  "What would your favorite manager say is your biggest strength?",
  "How do you balance quick execution with design quality?",
  "Can you share an example of a time when engineering feedback changed your design direction?",
  "What strategies do you use to quickly re-enter context after switching tasks?",
  "Describe a situation where you helped align different perspectives across product, design, and engineering.",
  "Tell me about a time you had to present a design direction that wasn't initially well understood. How did you build alignment?",
  "How do you balance quantitative data with qualitative insights?",
  "Have you designed experiences that include AI or automation? What challenges did you face?",
];

const RATING_OPTIONS = [
  { value: "strong", label: "Strong", color: "bg-green-500/10 text-green-700 border-green-200" },
  { value: "meets_expectations", label: "Meets Expectations", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { value: "needs_improvement", label: "Needs Improvement", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  { value: "weak", label: "Weak", color: "bg-red-500/10 text-red-700 border-red-200" },
];

interface ManagerInterviewAssessmentProps {
  candidate: HiringCandidate;
  isAdmin: boolean;
  onDataChange?: () => void;
}

interface Response {
  questionIndex: number;
  responseNotes: string | null;
  rating: string | null;
}

export const ManagerInterviewAssessment = ({
  candidate,
  isAdmin,
  onDataChange,
}: ManagerInterviewAssessmentProps) => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, Response>>({});
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.candidateAssessments.createDraft);
  const completeMutation = useMutation(api.candidateAssessments.complete);
  const removeAssessment = useMutation(api.candidateAssessments.remove);
  const upsertResponse = useMutation(api.interviewResponses.upsert);

  const allAssessments = useQuery(api.candidateAssessments.listForCandidate, {
    candidateId: candidate._id as Id<"hiringCandidates">,
  });

  const loading = allAssessments === undefined;

  // Filter to only manager_interview assessments and sort by creation time descending
  const assessments = [...(allAssessments || [])]
    .filter((a) => a.stage === "manager_interview")
    .sort((a, b) => b._creationTime - a._creationTime);

  const createAssessment = async () => {
    try {
      const id = await createDraftMutation({
        candidateId: candidate._id as Id<"hiringCandidates">,
        stage: "manager_interview",
      });

      setActiveAssessmentId(id);
      setResponses({});
      setCurrentStep(0);
      setWizardOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create assessment",
        variant: "destructive",
      });
    }
  };

  const loadAssessment = async (assessmentId: string) => {
    try {
      const data = await client.query(api.interviewResponses.listForAssessment, {
        assessmentId: assessmentId as Id<"candidateAssessments">,
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
      setActiveAssessmentId(assessmentId);
      setCurrentStep(0);
      setWizardOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load responses",
        variant: "destructive",
      });
    }
  };

  const saveResponse = async (questionIndex: number, notes: string, rating: string | null) => {
    if (!activeAssessmentId) return;

    try {
      await upsertResponse({
        assessmentId: activeAssessmentId as Id<"candidateAssessments">,
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
    const currentResponse = responses[currentStep];
    if (currentResponse) {
      await saveResponse(
        currentStep,
        currentResponse.responseNotes || "",
        currentResponse.rating
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
    if (!activeAssessmentId) return;

    // Save current response first
    const currentResponse = responses[currentStep];
    if (currentResponse) {
      await saveResponse(
        currentStep,
        currentResponse.responseNotes || "",
        currentResponse.rating
      );
    }

    // Calculate overall score based on ratings
    const ratingScores: Record<string, number> = {
      strong: 4,
      meets_expectations: 3,
      needs_improvement: 2,
      weak: 1,
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
        id: activeAssessmentId as Id<"candidateAssessments">,
        overallScore,
      });

      toast({
        title: "Success",
        description: "Interview assessment completed",
      });

      setWizardOpen(false);
      setActiveAssessmentId(null);
      onDataChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete assessment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await removeAssessment({ id: deletingId as Id<"candidateAssessments"> });
      toast({
        title: "Success",
        description: "Assessment deleted",
      });
      onDataChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
    }
    setDeletingId(null);
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

  const currentResponse = responses[currentStep] || {
    questionIndex: currentStep,
    responseNotes: "",
    rating: null,
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateString = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRatingBadge = (rating: string) => {
    const option = RATING_OPTIONS.find((o) => o.value === rating);
    return option ? (
      <Badge variant="outline" className={option.color}>
        {option.label}
      </Badge>
    ) : null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manager Interview Assessment</CardTitle>
          {isAdmin && (
            <Button onClick={createAssessment} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Assessment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No interview assessments yet.
              {isAdmin && " Click 'New Assessment' to start one."}
            </p>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={assessment.status === "completed" ? "default" : "secondary"}
                        >
                          {assessment.status === "completed" ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Completed
                            </span>
                          ) : (
                            "Draft"
                          )}
                        </Badge>
                        {assessment.overallScore != null && (
                          <Badge variant="outline">
                            Score: {assessment.overallScore.toFixed(1)}/4
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Started {formatDate(assessment._creationTime)}
                        {assessment.completedAt &&
                          ` • Completed ${formatDateString(assessment.completedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadAssessment(assessment._id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(assessment._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manager Interview Assessment</DialogTitle>
          </DialogHeader>

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

              {currentStep === INTERVIEW_QUESTIONS.length - 1 ? (
                <Button onClick={handleComplete}>
                  Complete Assessment
                  <Check className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this interview assessment and all its
              responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

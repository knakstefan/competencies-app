import { useState, useEffect } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { SubCompetency } from "@/types/competency";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Check, ArrowUp, ArrowDown } from "lucide-react";
import { AssessmentSummary } from "./AssessmentSummary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HiringCandidate } from "./HiringManagement";

interface Competency {
  _id: string;
  title: string;
  code: string;
  orderIndex: number;
  description?: string;
}

interface CandidateAssessmentWizardProps {
  open: boolean;
  onClose: () => void;
  candidate: HiringCandidate;
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  existingAssessmentId?: string | null;
}

export const CandidateAssessmentWizard = ({
  open,
  onClose,
  candidate,
  competencies,
  subCompetencies,
  existingAssessmentId = null,
}: CandidateAssessmentWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentId, setAssessmentId] = useState<Id<"candidateAssessments"> | null>(null);
  const [assessmentData, setAssessmentData] = useState<
    Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }>
  >({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.candidateAssessments.createDraft);
  const upsertProgress = useMutation(api.candidateProgress.upsert);
  const replaceEvals = useMutation(api.candidateEvaluations.replaceForProgress);
  const completeAssessment = useMutation(api.candidateAssessments.complete);

  const orderedSubCompetencies = [...subCompetencies].sort((a, b) => {
    const compA = competencies.find((c) => c._id === a.competencyId);
    const compB = competencies.find((c) => c._id === b.competencyId);

    if (compA && compB && compA.orderIndex !== compB.orderIndex) {
      return compA.orderIndex - compB.orderIndex;
    }

    return a.orderIndex - b.orderIndex;
  });

  const totalSteps = orderedSubCompetencies.length + 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    if (open) {
      if (existingAssessmentId) {
        setAssessmentId(existingAssessmentId as Id<"candidateAssessments">);
        loadExistingAssessment(existingAssessmentId as Id<"candidateAssessments">);
      } else if (!assessmentId) {
        createDraftAssessment();
      }
    }

    if (!open && assessmentId && !existingAssessmentId) {
      setCurrentStep(0);
      setAssessmentId(null);
      setAssessmentData({});
    }
  }, [open, existingAssessmentId]);

  const createDraftAssessment = async () => {
    setInitializing(true);
    try {
      const newId = await createDraftMutation({
        candidateId: candidate._id as Id<"hiringCandidates">,
        stage: candidate.currentStage,
      });

      setAssessmentId(newId);

      // Load previous assessment data as starting point
      await loadPreviousAssessmentData(newId);
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast({
        title: "Error",
        description: "Failed to create assessment",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const loadPreviousAssessmentData = async (newAssessmentId: Id<"candidateAssessments">) => {
    try {
      // Find the most recent completed assessment for this candidate
      const allAssessments = await client.query(
        api.candidateAssessments.listForCandidate,
        { candidateId: candidate._id as Id<"hiringCandidates"> }
      );

      // Filter to completed assessments and find the latest by completedAt
      const completedAssessments = allAssessments.filter(
        (a) => a.status === "completed" && a.completedAt
      );
      completedAssessments.sort((a, b) => {
        const aTime = a.completedAt || "";
        const bTime = b.completedAt || "";
        return bTime.localeCompare(aTime);
      });

      const latestAssessment = completedAssessments.length > 0 ? completedAssessments[0] : null;

      if (!latestAssessment) return;

      // Fetch progress data from the previous assessment
      const progressData = await client.query(
        api.candidateProgress.listForAssessment,
        { assessmentId: latestAssessment._id }
      );

      if (!progressData || progressData.length === 0) return;

      const loadedData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }> = {};

      for (const p of progressData) {
        // Load evaluations for this progress entry
        const evalData = await client.query(
          api.candidateEvaluations.listForProgress,
          { progressId: p._id }
        );

        const evaluations: Record<string, string> = {};
        evalData?.forEach((e) => {
          evaluations[e.criterionText] = e.evaluation;
        });

        const dataForSubComp = {
          level: p.currentLevel,
          notes: p.notes || undefined,
          evaluations: Object.keys(evaluations).length > 0 ? evaluations : undefined,
        };

        loadedData[p.subCompetencyId] = dataForSubComp;

        // Save this data to the new assessment immediately
        await saveProgressToDatabase(
          newAssessmentId,
          p.subCompetencyId as Id<"subCompetencies">,
          dataForSubComp.level,
          dataForSubComp.notes,
          dataForSubComp.evaluations
        );
      }

      setAssessmentData(loadedData);
    } catch (error) {
      console.error("Error loading previous assessment data:", error);
    }
  };

  const saveProgressToDatabase = async (
    assessmentIdParam: Id<"candidateAssessments">,
    subCompetencyId: Id<"subCompetencies">,
    level: string,
    notes?: string,
    evaluations?: Record<string, string>
  ) => {
    if (!assessmentIdParam) return;

    try {
      const progressId = await upsertProgress({
        assessmentId: assessmentIdParam,
        candidateId: candidate._id as Id<"hiringCandidates">,
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
          await replaceEvals({
            progressId,
            evaluations: evaluationsToInsert,
          });
        }
      }
    } catch (error) {
      console.error("Error saving progress to database:", error);
    }
  };

  const loadExistingAssessment = async (id: Id<"candidateAssessments">) => {
    setInitializing(true);
    try {
      const progressData = await client.query(
        api.candidateProgress.listForAssessment,
        { assessmentId: id }
      );

      const loadedData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }> = {};

      for (const p of progressData || []) {
        const evalData = await client.query(
          api.candidateEvaluations.listForProgress,
          { progressId: p._id }
        );

        const evaluations: Record<string, string> = {};
        evalData?.forEach((e) => {
          evaluations[e.criterionText] = e.evaluation;
        });

        loadedData[p.subCompetencyId] = {
          level: p.currentLevel,
          notes: p.notes || undefined,
          evaluations: Object.keys(evaluations).length > 0 ? evaluations : undefined,
        };
      }

      setAssessmentData(loadedData);
    } catch (error) {
      console.error("Error loading assessment:", error);
      toast({
        title: "Error",
        description: "Failed to load assessment",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const saveProgress = async (
    subCompetencyId: string,
    level: string,
    notes?: string,
    evaluations?: Record<string, string>
  ) => {
    if (!assessmentId) {
      toast({
        title: "Please wait",
        description: "Assessment is being initialized...",
      });
      return;
    }

    setAssessmentData((prev) => ({
      ...prev,
      [subCompetencyId]: { level, notes, evaluations },
    }));

    try {
      const progressId = await upsertProgress({
        assessmentId,
        candidateId: candidate._id as Id<"hiringCandidates">,
        subCompetencyId: subCompetencyId as Id<"subCompetencies">,
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
          await replaceEvals({
            progressId,
            evaluations: evaluationsToInsert,
          });
        }
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      if (currentSubCompetency) {
        const criteria = getCriteriaForLevel(currentSubCompetency, currentLevel);
        const currentEvaluations = currentData?.evaluations || {};

        const hasUnevaluatedCriteria = criteria.some((c) => !currentEvaluations[c]);

        if (hasUnevaluatedCriteria) {
          const updatedEvaluations = { ...currentEvaluations };
          criteria.forEach((criterion) => {
            if (!updatedEvaluations[criterion]) {
              updatedEvaluations[criterion] = "target";
            }
          });

          await saveProgress(currentSubCompetency._id, currentLevel, currentData?.notes, updatedEvaluations);
        }
      }

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

    setLoading(true);
    try {
      const totalSubCompetencies = subCompetencies.length;
      const assessedCount = Object.keys(assessmentData).length;
      const overallScore = (assessedCount / totalSubCompetencies) * 100;

      await completeAssessment({
        id: assessmentId,
        overallScore,
      });

      toast({
        title: "Success",
        description: "Assessment completed successfully",
      });

      onClose();
    } catch (error) {
      console.error("Error completing assessment:", error);
      toast({
        title: "Error",
        description: "Failed to complete assessment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentSubCompetency = currentStep < orderedSubCompetencies.length ? orderedSubCompetencies[currentStep] : null;
  const currentCompetency = currentSubCompetency
    ? competencies.find((c) => c._id === currentSubCompetency.competencyId)
    : null;

  const getLevelBelow = (level: string): string | null => {
    const levels = ["associate", "intermediate", "senior", "lead", "principal"];
    const index = levels.indexOf(level);
    return index > 0 ? levels[index - 1] : null;
  };

  const getLevelAbove = (level: string): string | null => {
    const levels = ["associate", "intermediate", "senior", "lead", "principal"];
    const index = levels.indexOf(level);
    return index < levels.length - 1 ? levels[index + 1] : null;
  };

  const getCriteriaForLevel = (sub: SubCompetency, level: string): string[] => {
    const levelToCamelCase: Record<string, string> = {
      associate: "associateLevel",
      intermediate: "intermediateLevel",
      senior: "seniorLevel",
      lead: "leadLevel",
      principal: "principalLevel",
    };
    const levelKey = levelToCamelCase[level] as keyof SubCompetency;
    if (!levelKey) return [];
    const criteria = sub[levelKey];
    return Array.isArray(criteria) ? criteria : [];
  };

  const currentData = currentSubCompetency ? assessmentData[currentSubCompetency._id] : null;
  const currentLevel = currentData?.level || candidate.targetRole.toLowerCase();
  const currentCriteria = currentSubCompetency ? getCriteriaForLevel(currentSubCompetency, currentLevel) : [];

  const handleLevelChange = (level: string) => {
    if (!currentSubCompetency) return;
    saveProgress(currentSubCompetency._id, level, currentData?.notes, currentData?.evaluations);
  };

  const handleNotesChange = (notes: string) => {
    if (!currentSubCompetency) return;
    const level = currentData?.level || candidate.targetRole.toLowerCase();
    saveProgress(currentSubCompetency._id, level, notes, currentData?.evaluations);
  };

  const handleEvaluationChange = (criterion: string, evaluation: string) => {
    if (!currentSubCompetency) return;
    const level = currentData?.level || candidate.targetRole.toLowerCase();
    const newEvaluations = { ...(currentData?.evaluations || {}), [criterion]: evaluation };
    saveProgress(currentSubCompetency._id, level, currentData?.notes, newEvaluations);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>
            {currentStep < subCompetencies.length
              ? `${currentCompetency?.title} - ${currentSubCompetency?.title}`
              : "Assessment Summary"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            {initializing ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Initializing assessment...</span>
              </div>
            ) : currentStep < subCompetencies.length && currentSubCompetency ? (
              <div className="space-y-4">
                {currentCompetency?.description && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <p className="text-sm">{currentCompetency.description}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {currentCriteria.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-base">Criteria Assessment</Label>
                        {currentCriteria.map((criterion, index) => {
                          const currentEvaluation = currentData?.evaluations?.[criterion] || "target";
                          const levelBelow = getLevelBelow(currentLevel);
                          const levelAbove = getLevelAbove(currentLevel);
                          const criteriaBelowArray =
                            currentSubCompetency && levelBelow
                              ? getCriteriaForLevel(currentSubCompetency, levelBelow)
                              : [];
                          const criteriaAboveArray =
                            currentSubCompetency && levelAbove
                              ? getCriteriaForLevel(currentSubCompetency, levelAbove)
                              : [];
                          const criteriaBelow = criteriaBelowArray[index] || null;
                          const criteriaAbove = criteriaAboveArray[index] || null;
                          const hasBelowOption = levelBelow !== null;
                          const hasAboveOption = levelAbove !== null;

                          return (
                            <div key={index} className="p-4 rounded-lg bg-muted/30 space-y-3">
                              <div className="grid grid-cols-3 gap-4 items-end">
                                <div className="flex items-start justify-between gap-2 col-span-2">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      At Target ({currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)})
                                    </p>
                                    <p className="text-sm font-medium">{criterion}</p>
                                  </div>
                                </div>
                                {(currentEvaluation === "below" ||
                                  currentEvaluation === "well_below" ||
                                  currentEvaluation === "above" ||
                                  currentEvaluation === "well_above") && (
                                  <div>
                                    {(currentEvaluation === "below" || currentEvaluation === "well_below") && (
                                      <div>
                                        <p className="text-sm font-medium text-destructive mb-1 flex gap-1">
                                          <ArrowDown className="mr-2 h-4 w-4" />
                                          <span>
                                            {criteriaBelow
                                              ? `Operating At (${levelBelow!.charAt(0).toUpperCase() + levelBelow!.slice(1)})`
                                              : "Operating Below"}
                                          </span>
                                        </p>
                                      </div>
                                    )}

                                    {(currentEvaluation === "above" || currentEvaluation === "well_above") &&
                                      criteriaAbove && (
                                        <div>
                                          <p className="text-sm font-medium text-primary mb-1 flex gap-1">
                                            <ArrowUp className="mr-2 h-4 w-4" />
                                            <span>
                                              Operating At ({levelAbove.charAt(0).toUpperCase() + levelAbove.slice(1)})
                                            </span>
                                          </p>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>

                              <Tabs
                                value={currentEvaluation}
                                onValueChange={(value) => handleEvaluationChange(criterion, value)}
                                className="w-full"
                              >
                                <TabsList className="grid w-full grid-cols-5">
                                  <TabsTrigger value="well_below" className="text-xs px-1">
                                    Well Below
                                  </TabsTrigger>
                                  <TabsTrigger value="below" className="text-xs px-1">
                                    Below
                                  </TabsTrigger>
                                  <TabsTrigger value="target" className="text-xs px-1">
                                    At Target
                                  </TabsTrigger>
                                  <TabsTrigger value="above" className="text-xs px-1" disabled={!hasAboveOption}>
                                    Above
                                  </TabsTrigger>
                                  <TabsTrigger value="well_above" className="text-xs px-1" disabled={!hasAboveOption}>
                                    Well Above
                                  </TabsTrigger>
                                </TabsList>
                              </Tabs>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={currentData?.notes || ""}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add notes about this assessment..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <AssessmentSummary
                competencies={competencies}
                subCompetencies={subCompetencies}
                assessmentData={assessmentData}
              />
            )}
          </div>
        </div>

        <div className="flex justify-between px-6 py-4 border-t shrink-0 bg-background">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0 || initializing}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button onClick={handleNext} disabled={initializing}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading || initializing}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Complete Assessment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

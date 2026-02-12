import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Competency, SubCompetency } from "@/types/competency";
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
import { cn } from "@/lib/utils";

interface AssessmentWizardProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberRole: string;
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  existingAssessmentId?: string | null;
}

export const AssessmentWizard = ({
  open,
  onClose,
  memberId,
  memberRole,
  competencies,
  subCompetencies,
  existingAssessmentId = null,
}: AssessmentWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentId, setAssessmentId] = useState<Id<"assessments"> | null>(null);
  const [assessmentData, setAssessmentData] = useState<
    Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }>
  >({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();

  const client = useConvex();
  const createDraftMutation = useMutation(api.assessments.createDraft);
  const upsertProgress = useMutation(api.progress.upsert);
  const replaceEvals = useMutation(api.evaluations.replaceForProgress);
  const completeAssessment = useMutation(api.assessments.complete);

  const orderedSubCompetencies = [...subCompetencies].sort((a, b) => {
    const compA = competencies.find((c) => c._id === a.competencyId);
    const compB = competencies.find((c) => c._id === b.competencyId);

    if (compA && compB && compA.orderIndex !== compB.orderIndex) {
      return compA.orderIndex - compB.orderIndex;
    }

    return a.orderIndex - b.orderIndex;
  });

  const totalSteps = orderedSubCompetencies.length + 1; // +1 for summary
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    if (open) {
      if (existingAssessmentId) {
        // Load existing assessment
        setAssessmentId(existingAssessmentId as Id<"assessments">);
        loadExistingAssessment(existingAssessmentId as Id<"assessments">);
      } else if (!assessmentId) {
        // Create new assessment
        createDraftAssessment();
      }
    }

    // Reset when closing
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
        memberId: memberId as Id<"teamMembers">,
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

  const loadPreviousAssessmentData = async (newAssessmentId: Id<"assessments">) => {
    try {
      // Find the most recent completed assessment for this member
      const completedAssessments = await client.query(
        api.assessments.getCompletedForMember,
        { memberId: memberId as Id<"teamMembers"> }
      );

      // getCompletedForMember returns sorted by completedAt ascending, so last is most recent
      const latestAssessment = completedAssessments.length > 0
        ? completedAssessments[completedAssessments.length - 1]
        : null;

      if (!latestAssessment) return;

      // Fetch progress data from the previous assessment
      const progressData = await client.query(
        api.progress.listForAssessment,
        { assessmentId: latestAssessment._id }
      );

      if (!progressData || progressData.length === 0) return;

      // Load evaluations for all progress entries
      const progressIds = progressData.map((p) => p._id);
      const allEvals = await client.query(
        api.evaluations.listForProgressIds,
        { progressIds }
      );

      // Build loaded data and save to new assessment
      const loadedData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }> = {};

      for (const p of progressData) {
        const evalsForProgress = allEvals.filter((e) => e.progressId === p._id);
        const evaluations: Record<string, string> = {};
        evalsForProgress.forEach((e) => {
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
          dataForSubComp.evaluations,
        );
      }

      setAssessmentData(loadedData);
    } catch (error) {
      console.error("Error loading previous assessment data:", error);
      // Don't show error toast - this is optional functionality
    }
  };

  const saveProgressToDatabase = async (
    assessmentIdParam: Id<"assessments">,
    subCompetencyId: Id<"subCompetencies">,
    level: string,
    notes?: string,
    evaluations?: Record<string, string>,
  ) => {
    if (!assessmentIdParam) return;

    try {
      // Upsert progress entry for this assessment
      const progressId = await upsertProgress({
        assessmentId: assessmentIdParam,
        memberId: memberId as Id<"teamMembers">,
        subCompetencyId,
        currentLevel: level,
        notes: notes || undefined,
      });

      // Save criteria evaluations if provided
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

  const loadExistingAssessment = async (id: Id<"assessments">) => {
    setInitializing(true);
    try {
      // Fetch existing progress for this assessment
      const progressData = await client.query(
        api.progress.listForAssessment,
        { assessmentId: id }
      );

      // Load evaluations for all progress entries
      const progressIds = (progressData || []).map((p) => p._id);
      const allEvals = progressIds.length > 0
        ? await client.query(api.evaluations.listForProgressIds, { progressIds })
        : [];

      const loadedData: Record<string, { level: string; notes?: string; evaluations?: Record<string, string> }> = {};

      for (const p of progressData || []) {
        const evalsForProgress = allEvals.filter((e) => e.progressId === p._id);
        const evaluations: Record<string, string> = {};
        evalsForProgress.forEach((e) => {
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
    evaluations?: Record<string, string>,
  ) => {
    if (!assessmentId) {
      toast({
        title: "Please wait",
        description: "Assessment is being initialized...",
      });
      return;
    }

    // Optimistically update local state so the UI stays responsive
    setAssessmentData((prev) => ({
      ...prev,
      [subCompetencyId]: { level, notes, evaluations },
    }));

    try {
      // Upsert progress (atomic - handles check-then-insert/update server-side)
      const progressId = await upsertProgress({
        assessmentId,
        memberId: memberId as Id<"teamMembers">,
        subCompetencyId: subCompetencyId as Id<"subCompetencies">,
        currentLevel: level,
        notes: notes || undefined,
      });

      // Save criteria evaluations if provided
      if (progressId && evaluations) {
        try {
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
        } catch (evalErr) {
          console.error("Unexpected error saving criteria evaluations:", evalErr);
          toast({
            title: "Partial save",
            description: "Level and notes saved, but criteria evaluations could not be updated.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      const err: any = error;
      const message = err?.message || err?.details || "Failed to save progress";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      // Save default "target" evaluations for any criteria that haven't been explicitly set
      if (currentSubCompetency) {
        const criteria = getCriteriaForLevel(currentSubCompetency, currentLevel);
        const currentEvaluations = currentData?.evaluations || {};

        // Check if there are any criteria without evaluations
        const hasUnevaluatedCriteria = criteria.some((c) => !currentEvaluations[c]);

        if (hasUnevaluatedCriteria) {
          // Set default "target" for all criteria that don't have a value
          const updatedEvaluations = { ...currentEvaluations };
          criteria.forEach((criterion) => {
            if (!updatedEvaluations[criterion]) {
              updatedEvaluations[criterion] = "target";
            }
          });

          // Save with the updated evaluations
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
      // Calculate overall score
      const totalSubCompetencies = subCompetencies.length;
      const assessedCount = Object.keys(assessmentData).length;
      const overallScore = (assessedCount / totalSubCompetencies) * 100;

      // Mark assessment as completed
      await completeAssessment({
        id: assessmentId,
        overallScore,
      });

      toast({
        title: "Success",
        description: "Assessment completed successfully",
      });

      onClose();

      // Reset happens in useEffect
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

  // Get level N steps below (e.g., n=2 for well_below)
  const getLevelNBelow = (level: string, n: number): string | null => {
    const levels = ["associate", "intermediate", "senior", "lead", "principal"];
    const index = levels.indexOf(level);
    const targetIndex = index - n;
    // Return the target level if it exists, otherwise the lowest available
    if (targetIndex >= 0) {
      return levels[targetIndex];
    } else if (index > 0) {
      // Return the lowest level if we can go at least one step down
      return levels[0];
    }
    return null;
  };

  // Get level N steps above (e.g., n=2 for well_above)
  const getLevelNAbove = (level: string, n: number): string | null => {
    const levels = ["associate", "intermediate", "senior", "lead", "principal"];
    const index = levels.indexOf(level);
    const targetIndex = index + n;
    // Return the target level if it exists, otherwise the highest available
    if (targetIndex < levels.length) {
      return levels[targetIndex];
    } else if (index < levels.length - 1) {
      // Return the highest level if we can go at least one step up
      return levels[levels.length - 1];
    }
    return null;
  };

  // Determine the display level based on evaluation
  const getDisplayLevel = (evaluation: string, baseLevel: string): string | null => {
    switch (evaluation) {
      case "well_below":
        return getLevelNBelow(baseLevel, 2); // 2 levels below
      case "below":
        return getLevelNBelow(baseLevel, 1); // 1 level below
      case "above":
        return getLevelNAbove(baseLevel, 1); // 1 level above
      case "well_above":
        return getLevelNAbove(baseLevel, 2); // 2 levels above
      default:
        return null; // At target - no change
    }
  };

  const levelToCamelCase: Record<string, string> = {
    associate: "associateLevel",
    intermediate: "intermediateLevel",
    senior: "seniorLevel",
    lead: "leadLevel",
    principal: "principalLevel",
  };

  const getCriteriaForLevel = (sub: SubCompetency, level: string): string[] => {
    const levelKey = levelToCamelCase[level] as keyof SubCompetency;
    if (!levelKey) return [];
    const criteria = sub[levelKey];
    return Array.isArray(criteria) ? criteria : [];
  };

  const currentData = currentSubCompetency ? assessmentData[currentSubCompetency._id] : null;
  const currentLevel = currentData?.level || memberRole.toLowerCase();
  const currentCriteria = currentSubCompetency ? getCriteriaForLevel(currentSubCompetency, currentLevel) : [];

  const handleLevelChange = (level: string) => {
    if (!currentSubCompetency) return;
    saveProgress(currentSubCompetency._id, level, currentData?.notes, currentData?.evaluations);
  };

  const handleNotesChange = (notes: string) => {
    if (!currentSubCompetency) return;
    // Make sure we have a level set before saving
    const level = currentData?.level || memberRole.toLowerCase();
    saveProgress(currentSubCompetency._id, level, notes, currentData?.evaluations);
  };

  const handleEvaluationChange = (criterion: string, evaluation: string) => {
    if (!currentSubCompetency) return;
    // Make sure we have a level set before saving
    const level = currentData?.level || memberRole.toLowerCase();
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
                    <div className="space-y-2 hidden">
                      <Label>Current Level</Label>
                      <select
                        value={currentLevel}
                        onChange={(e) => handleLevelChange(e.target.value)}
                        className="w-full p-2 rounded-md border"
                      >
                        <option value="associate">Associate</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead</option>
                        <option value="principal">Principal</option>
                      </select>
                    </div>

                    {currentCriteria.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-base">Criteria Assessment</Label>
                        {currentCriteria.map((criterion, index) => {
                          const currentEvaluation = currentData?.evaluations?.[criterion] || "target";
                          const levelBelow = getLevelBelow(currentLevel);
                          const levelAbove = getLevelAbove(currentLevel);
                          const hasBelowOption = levelBelow !== null;
                          const hasAboveOption = levelAbove !== null;

                          // Get the display level based on evaluation (supports 2 levels for well_above/well_below)
                          const displayLevel = getDisplayLevel(currentEvaluation, currentLevel);
                          const displayCriteriaArray =
                            displayLevel && currentSubCompetency
                              ? getCriteriaForLevel(currentSubCompetency, displayLevel)
                              : [];
                          const displayCriteria = displayCriteriaArray[index] || null;

                          const isBelow = currentEvaluation === "below" || currentEvaluation === "well_below";
                          const isAbove = currentEvaluation === "above" || currentEvaluation === "well_above";

                          return (
                            <div key={index} className="p-4 rounded-lg bg-muted/30 space-y-3">
                              <div className="space-y-2">
                                {/* Dynamic header showing the operating level */}
                                <div className="flex items-center gap-2">
                                  {isBelow && (
                                    <ArrowDown className="h-4 w-4 text-destructive" />
                                  )}
                                  {isAbove && displayLevel && (
                                    <ArrowUp className="h-4 w-4 text-primary" />
                                  )}
                                  <p className={cn(
                                    "text-xs font-medium",
                                    isBelow && "text-destructive",
                                    isAbove && displayLevel && "text-primary",
                                    !isBelow && !(isAbove && displayLevel) && "text-muted-foreground"
                                  )}>
                                    {isBelow && displayLevel
                                      ? `Operating At (${displayLevel.charAt(0).toUpperCase() + displayLevel.slice(1)})`
                                      : isBelow && !displayLevel
                                      ? "Operating Below"
                                      : isAbove && displayLevel
                                      ? `Operating At (${displayLevel.charAt(0).toUpperCase() + displayLevel.slice(1)})`
                                      : `At Target (${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)})`
                                    }
                                  </p>
                                </div>

                                {/* Single dynamic criteria description */}
                                <p className={cn(
                                  "text-sm font-medium",
                                  isBelow && "text-destructive/90",
                                  isAbove && displayLevel && "text-primary/90"
                                )}>
                                  {displayCriteria || criterion}
                                </p>
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

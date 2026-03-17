import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ProgressViewSkeleton } from "./skeletons/ProgressViewSkeleton";
import { HiringCandidate, HiringStage } from "./HiringManagement";
import { StageProgressIndicator } from "./StageProgressIndicator";
import { CandidateStageAssessments } from "./CandidateStageAssessments";

interface CandidateProgressViewProps {
  candidate: HiringCandidate;
  isAdmin: boolean;
  onDataChange?: () => void;
  onStageChange?: (candidateId: string, newStage: string) => Promise<void>;
  roleId?: string;
  sidebar?: React.ReactNode;
}

export const CandidateProgressView = ({
  candidate,
  isAdmin,
  onDataChange,
  onStageChange,
  roleId,
  sidebar,
}: CandidateProgressViewProps) => {
  const globalCompetencies = useQuery(
    api.competencies.list,
    roleId ? "skip" : {}
  );
  const globalSubCompetencies = useQuery(
    api.competencies.listSubCompetencies,
    roleId ? "skip" : {}
  );
  const roleCompetencies = useQuery(
    api.competencies.listByRole,
    roleId ? { roleId: roleId as any } : "skip"
  );
  const roleSubCompetencies = useQuery(
    api.competencies.listSubCompetenciesByRole,
    roleId ? { roleId: roleId as any } : "skip"
  );
  const competencies = roleId ? roleCompetencies : globalCompetencies;
  const subCompetencies = roleId ? roleSubCompetencies : globalSubCompetencies;

  // Fetch hiring stages for this role
  const stages = useQuery(
    api.hiringStages.listByRole,
    roleId ? { roleId: roleId as Id<"roles"> } : "skip"
  ) as HiringStage[] | undefined;

  // Fetch assessments to derive stage scores for the progress indicator
  const assessments = useQuery(api.candidateAssessments.listForCandidate, {
    candidateId: candidate._id as Id<"hiringCandidates">,
  });

  const loading = competencies === undefined || subCompetencies === undefined;

  const handleStageChange = async (newStage: string) => {
    if (onStageChange) {
      await onStageChange(candidate._id, newStage);
    }
  };

  // Build stage scores map — keyed by stageId or legacy stage string
  const stageScores: Record<string, number> = {};
  if (assessments) {
    for (const a of assessments) {
      if (a.status === "completed" && a.overallScore != null) {
        const key = a.stageId || a.stage;
        stageScores[key] = a.overallScore;
      }
    }
  }

  const hasCompletedSummary = assessments?.some(
    (a: any) => a.status === "completed" && a.generatedSummary
  );
  const showSidebar = sidebar && hasCompletedSummary;

  if (loading) {
    return <ProgressViewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <StageProgressIndicator
        currentStage={candidate.currentStage}
        isAdmin={isAdmin}
        onStageChange={handleStageChange}
        stageScores={stageScores}
        stages={stages || []}
      />

      <div className={showSidebar ? "grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8" : ""}>
        <CandidateStageAssessments
          candidate={candidate}
          isAdmin={isAdmin}
          competencies={(competencies || []).map((c) => ({
            _id: c._id,
            title: c.title,
            code: c.code || "",
            orderIndex: c.orderIndex,
          }))}
          subCompetencies={subCompetencies || []}
          onDataChange={onDataChange}
          stages={stages || []}
        />
        {showSidebar && (
          <div className="lg:sticky lg:top-6 lg:self-start">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
};

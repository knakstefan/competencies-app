import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ProgressViewSkeleton } from "./skeletons/ProgressViewSkeleton";
import { HiringCandidate } from "./HiringManagement";
import { StageProgressIndicator } from "./StageProgressIndicator";
import { CandidateStageAssessments } from "./CandidateStageAssessments";

interface CandidateProgressViewProps {
  candidate: HiringCandidate;
  isAdmin: boolean;
  onDataChange?: () => void;
  onStageChange?: (candidateId: string, newStage: string) => Promise<void>;
  roleId?: string;
}

export const CandidateProgressView = ({
  candidate,
  isAdmin,
  onDataChange,
  onStageChange,
  roleId,
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

  // Build stage scores map
  const stageScores: Record<string, number> = {};
  if (assessments) {
    for (const a of assessments) {
      if (a.status === "completed" && a.overallScore != null) {
        stageScores[a.stage] = a.overallScore;
      }
    }
  }

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
      />

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
      />
    </div>
  );
};

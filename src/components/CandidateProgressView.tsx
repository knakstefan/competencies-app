import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProgressViewSkeleton } from "./skeletons/ProgressViewSkeleton";
import { HiringCandidate } from "./HiringManagement";
import { StageProgressIndicator } from "./StageProgressIndicator";
import { CandidateStageAssessments } from "./CandidateStageAssessments";

interface CandidateProgressViewProps {
  candidate: HiringCandidate;
  isAdmin: boolean;
  onDataChange?: () => void;
  onStageChange?: (candidateId: string, newStage: string) => Promise<void>;
}

export const CandidateProgressView = ({
  candidate,
  isAdmin,
  onDataChange,
  onStageChange,
}: CandidateProgressViewProps) => {
  const competencies = useQuery(api.competencies.list);
  const subCompetencies = useQuery(api.competencies.listSubCompetencies);

  const loading = competencies === undefined || subCompetencies === undefined;

  const handleStageChange = async (newStage: string) => {
    if (onStageChange) {
      await onStageChange(candidate._id, newStage);
    }
  };

  if (loading) {
    return <ProgressViewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <StageProgressIndicator
        currentStage={candidate.currentStage}
        isAdmin={isAdmin}
        onStageChange={handleStageChange}
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

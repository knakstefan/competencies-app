import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/hooks/use-toast";
import { CandidateProgressView } from "@/components/CandidateProgressView";
import { HiringCandidate } from "@/components/HiringManagement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";

const CandidateDetailPage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { roleId } = useRole();
  const { toast } = useToast();

  const updateStage = useMutation(api.candidates.updateStage);

  const candidate = useQuery(
    api.candidates.get,
    candidateId ? { id: candidateId as Id<"hiringCandidates"> } : "skip"
  );

  const handleStageChange = async (candidateId: string, newStage: string) => {
    try {
      await updateStage({ id: candidateId as Id<"hiringCandidates">, currentStage: newStage });
      toast({
        title: "Success",
        description: "Candidate stage updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stage",
        variant: "destructive",
      });
    }
  };

  if (candidate === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (candidate === null) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Candidate not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/roles/${roleId}/hiring`)}>
          Back to Hiring
        </Button>
      </div>
    );
  }

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-up">
          <Badge variant="outline" className="text-xs">
            {candidate.targetRole}
          </Badge>
          <h1 className="text-4xl font-bold gradient-heading">{candidate.name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {candidate.email && <span>{candidate.email}</span>}
            {candidate.portfolioUrl && (
              <a
                href={candidate.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Portfolio
              </a>
            )}
          </div>
          {candidate.notes && (
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">{candidate.notes}</p>
          )}
        </div>

        <CandidateProgressView
          candidate={candidate as HiringCandidate}
          isAdmin={isAdmin}
          onStageChange={handleStageChange}
          roleId={roleId}
        />
      </div>
    </div>
  );
};

export default CandidateDetailPage;

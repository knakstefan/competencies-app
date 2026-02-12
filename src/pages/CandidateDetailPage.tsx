import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CandidateProgressView } from "@/components/CandidateProgressView";
import { HiringCandidate } from "@/components/HiringManagement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

const CandidateDetailPage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
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
        <Button variant="outline" className="mt-4" onClick={() => navigate("/hiring")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hiring
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => navigate("/hiring")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">{candidate.name}</h2>
            <Badge variant="outline">{candidate.targetRole}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
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
            <p className="mt-2 text-sm text-muted-foreground">{candidate.notes}</p>
          )}
        </div>
      </div>

      <CandidateProgressView
        candidate={candidate as HiringCandidate}
        isAdmin={isAdmin}
        onStageChange={handleStageChange}
      />
    </div>
  );
};

export default CandidateDetailPage;

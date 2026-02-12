import { ViewTab } from "@/components/ViewTab";
import { CompetencyIntroduction } from "@/components/CompetencyIntroduction";
import { useAuth } from "@/hooks/useAuth";
import { useCompetencies } from "@/hooks/useCompetencies";
import { Loader2 } from "lucide-react";

const ViewPage = () => {
  const { isSignedIn } = useAuth();
  const { competencies, subCompetencies, loading } = useCompetencies();

  if (loading || !isSignedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <CompetencyIntroduction /> */}
      <ViewTab competencies={competencies} subCompetencies={subCompetencies} loading={loading} />
    </div>
  );
};

export default ViewPage;

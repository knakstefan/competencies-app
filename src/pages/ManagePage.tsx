import { ManageTab } from "@/components/ManageTab";
import { useAuth } from "@/hooks/useAuth";
import { useCompetencies } from "@/hooks/useCompetencies";
import { Loader2 } from "lucide-react";

const ManagePage = () => {
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
      <ManageTab
        competencies={competencies}
        subCompetencies={subCompetencies}
        onUpdate={() => {}}
        loading={loading}
      />
    </div>
  );
};

export default ManagePage;

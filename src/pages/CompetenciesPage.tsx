import { ManageTab } from "@/components/ManageTab";
import { ViewTab } from "@/components/ViewTab";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useCompetencies } from "@/hooks/useCompetencies";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Pencil, SlidersVertical } from "lucide-react";

const CompetenciesPage = () => {
  const { isSignedIn } = useAuth();
  const { roleId } = useRole();
  const { competencies, subCompetencies, loading } = useCompetencies(roleId);

  if (loading || !isSignedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="manage" className="space-y-6">
      <TabsList className="grid grid-cols-2 max-w-md mx-auto">
        <TabsTrigger value="manage" className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5" />
          Manage
        </TabsTrigger>
        <TabsTrigger value="levels" className="flex items-center gap-2">
          <SlidersVertical className="w-3.5 h-3.5" />
          Levels
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manage">
        <ManageTab
          competencies={competencies}
          subCompetencies={subCompetencies}
          onUpdate={() => {}}
          loading={loading}
          roleId={roleId}
        />
      </TabsContent>

      <TabsContent value="levels">
        <ViewTab
          competencies={competencies}
          subCompetencies={subCompetencies}
          loading={loading}
        />
      </TabsContent>
    </Tabs>
  );
};

export default CompetenciesPage;

import { TeamManagement } from "@/components/TeamManagement";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const TeamPage = () => {
  const { isAdmin, isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TeamManagement isAdmin={isAdmin} />
    </div>
  );
};

export default TeamPage;

import { UserManagement } from "@/components/UserManagement";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const UsersPage = () => {
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
      <UserManagement isAdmin={isAdmin} />
    </div>
  );
};

export default UsersPage;

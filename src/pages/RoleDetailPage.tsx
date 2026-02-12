import { Outlet, useNavigate } from "react-router-dom";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { RoleBreadcrumb } from "@/components/RoleBreadcrumb";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const RoleDetailContent = () => {
  const { role, isLoading } = useRole();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Role not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
          Back to Roles
        </Button>
      </div>
    );
  }

  return (
    <>
      <RoleBreadcrumb />
      <Outlet />
    </>
  );
};

const RoleDetailPage = () => {
  return (
    <RoleProvider>
      <RoleDetailContent />
    </RoleProvider>
  );
};

export default RoleDetailPage;

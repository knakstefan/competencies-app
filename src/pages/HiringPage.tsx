import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { HiringManagement } from "@/components/HiringManagement";

const HiringPage = () => {
  const { isAdmin } = useAuth();
  const { roleId } = useRole();

  return <HiringManagement isAdmin={isAdmin} roleId={roleId} />;
};

export default HiringPage;

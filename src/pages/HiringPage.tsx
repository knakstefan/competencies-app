import { useAuth } from "@/hooks/useAuth";
import { HiringManagement } from "@/components/HiringManagement";

const HiringPage = () => {
  const { isAdmin } = useAuth();

  return <HiringManagement isAdmin={isAdmin} />;
};

export default HiringPage;

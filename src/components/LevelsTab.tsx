import { ViewTab } from "./ViewTab";
import { RoleLevel } from "@/lib/levelUtils";
import { Competency, SubCompetency } from "@/types/competency";

interface LevelsTabProps {
  roleType: "ic" | "management";
  levels: RoleLevel[];
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  loading: boolean;
}

export const LevelsTab = ({ competencies, subCompetencies, loading, levels }: LevelsTabProps) => {
  return (
    <ViewTab
      competencies={competencies}
      subCompetencies={subCompetencies}
      loading={loading}
      levels={levels}
    />
  );
};

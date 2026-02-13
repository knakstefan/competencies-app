import { useState } from "react";
import { CompetencyCard } from "@/components/CompetencyCard";
import { CompetencyCardSkeleton } from "@/components/skeletons/CompetencyCardSkeleton";
import { LevelFilter } from "@/components/LevelFilter";
import { Competency, SubCompetency } from "@/types/competency";
import { RoleLevel, FALLBACK_LEVELS, getCriteriaForLevelWithFallback } from "@/lib/levelUtils";

interface ViewTabProps {
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  loading?: boolean;
  levels?: RoleLevel[];
}

export const ViewTab = ({ competencies, subCompetencies, loading = false, levels = FALLBACK_LEVELS }: ViewTabProps) => {
  const [selectedLevel, setSelectedLevel] = useState<string>(levels[0]?.key || "associate");

  const getLevelDescription = (sub: SubCompetency) => {
    const criteria = getCriteriaForLevelWithFallback(sub, selectedLevel);
    return criteria.length > 0 ? criteria.join("\n• ") : "";
  };

  const getSubCompetenciesForCompetency = (competencyId: string) => {
    return subCompetencies
      .filter((sub) => sub.competencyId === competencyId)
      .map((sub) => ({
        id: sub._id,
        title: sub.title,
        description: getLevelDescription(sub),
      }));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-foreground hidden">Select Designer Level</h2>
          <LevelFilter currentLevel={selectedLevel} onLevelChange={setSelectedLevel} levels={levels} />
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <CompetencyCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {competencies.map((comp) => (
              <CompetencyCard
                key={comp._id}
                title={comp.title}
                subCompetencies={getSubCompetenciesForCompetency(comp._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

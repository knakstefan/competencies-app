import { useState } from "react";
import { CompetencyCard } from "@/components/CompetencyCard";
import { CompetencyCardSkeleton } from "@/components/skeletons/CompetencyCardSkeleton";
import { LevelFilter, Level } from "@/components/LevelFilter";
import { Competency, SubCompetency } from "@/types/competency";

interface ViewTabProps {
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  loading?: boolean;
}

export const ViewTab = ({ competencies, subCompetencies, loading = false }: ViewTabProps) => {
  const [selectedLevel, setSelectedLevel] = useState<Level>("associate");

  const getLevelDescription = (sub: SubCompetency) => {
    const levelMap = {
      associate: sub.associateLevel,
      intermediate: sub.intermediateLevel,
      senior: sub.seniorLevel,
      lead: sub.leadLevel,
      principal: sub.principalLevel,
    };
    const criteria = levelMap[selectedLevel] || [];
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-foreground hidden">Select Designer Level</h2>
          <LevelFilter currentLevel={selectedLevel} onLevelChange={setSelectedLevel} />
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

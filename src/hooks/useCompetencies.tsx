import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const useCompetencies = () => {
  const competencies = useQuery(api.competencies.list) || [];
  const subCompetencies = useQuery(api.competencies.listSubCompetencies) || [];
  const loading = competencies === undefined || subCompetencies === undefined;

  return { competencies, subCompetencies, loading };
};

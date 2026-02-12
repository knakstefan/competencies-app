import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export const useCompetencies = (roleId?: Id<"roles">) => {
  const globalCompetencies = useQuery(
    api.competencies.list,
    roleId ? "skip" : {}
  );
  const globalSubCompetencies = useQuery(
    api.competencies.listSubCompetencies,
    roleId ? "skip" : {}
  );
  const roleCompetencies = useQuery(
    api.competencies.listByRole,
    roleId ? { roleId } : "skip"
  );
  const roleSubCompetencies = useQuery(
    api.competencies.listSubCompetenciesByRole,
    roleId ? { roleId } : "skip"
  );

  const competencies = (roleId ? roleCompetencies : globalCompetencies) || [];
  const subCompetencies = (roleId ? roleSubCompetencies : globalSubCompetencies) || [];
  const loading = roleId
    ? roleCompetencies === undefined || roleSubCompetencies === undefined
    : globalCompetencies === undefined || globalSubCompetencies === undefined;

  return { competencies, subCompetencies, loading };
};

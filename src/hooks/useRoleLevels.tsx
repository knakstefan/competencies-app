import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getLevelsForRoleType, RoleLevel } from "@/lib/levelUtils";

export const useRoleLevels = (roleId?: Id<"roles"> | string, roleType?: "ic" | "management") => {
  // Always call the hook (React rules), but skip if roleType is provided directly
  const role = useQuery(
    api.roles.get,
    !roleType && roleId ? { id: roleId as Id<"roles"> } : "skip"
  );

  // If roleType is provided directly, return fixed levels immediately
  if (roleType) {
    return { levels: getLevelsForRoleType(roleType), loading: false };
  }

  const loading = roleId ? role === undefined : false;
  const resolvedType = role?.type || "ic";
  const levels: RoleLevel[] = getLevelsForRoleType(resolvedType);

  return { levels, loading };
};

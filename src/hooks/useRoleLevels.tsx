import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getLevelsForRoleType, RoleLevel } from "@/lib/levelUtils";

export const useRoleLevels = (roleId?: Id<"roles"> | string, roleType?: "ic" | "management") => {
  // Query DB levels for this role
  const dbLevels = useQuery(
    api.roleLevels.listByRole,
    roleId ? { roleId: roleId as Id<"roles"> } : "skip"
  );

  // Always call the hook (React rules), but skip if roleType is provided directly
  const role = useQuery(
    api.roles.get,
    !roleType && roleId ? { id: roleId as Id<"roles"> } : "skip"
  );

  // If roleType is provided directly and no roleId, return fixed levels
  if (roleType && !roleId) {
    return { levels: getLevelsForRoleType(roleType), loading: false };
  }

  const loading = roleId ? (dbLevels === undefined || (!roleType && role === undefined)) : false;

  // If DB levels exist, use them
  if (dbLevels && dbLevels.length > 0) {
    const levels: RoleLevel[] = dbLevels.map((l) => ({
      _id: l._id,
      roleId: l.roleId,
      key: l.key,
      label: l.label,
      description: l.description,
      orderIndex: l.orderIndex,
    }));
    return { levels, loading: false };
  }

  // Fall back to hardcoded levels based on role type
  const resolvedType = roleType || role?.type || "ic";
  const levels: RoleLevel[] = getLevelsForRoleType(resolvedType);

  return { levels, loading };
};

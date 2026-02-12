import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface RoleContextValue {
  roleId: Id<"roles">;
  role: {
    _id: Id<"roles">;
    title: string;
    type: "ic" | "management";
    description?: string;
    orderIndex: number;
  } | null;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const { roleId } = useParams<{ roleId: string }>();
  const role = useQuery(
    api.roles.get,
    roleId ? { id: roleId as Id<"roles"> } : "skip"
  );

  const value: RoleContextValue = {
    roleId: roleId as Id<"roles">,
    role: role as RoleContextValue["role"],
    isLoading: role === undefined,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};

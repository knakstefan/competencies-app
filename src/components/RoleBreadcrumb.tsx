import { Link, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRole } from "@/hooks/useRole";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TAB_LABELS: Record<string, string> = {
  competencies: "Competencies",
  team: "Team",
  hiring: "Hiring",
};

export const RoleBreadcrumb = () => {
  const { role, roleId } = useRole();
  const location = useLocation();

  // Parse path segments after /roles/:roleId/
  const pathAfterRole = location.pathname.replace(`/roles/${roleId}`, "").replace(/^\//, "");
  const segments = pathAfterRole.split("/").filter(Boolean);
  const currentTab = segments[0];
  const tabLabel = currentTab ? (TAB_LABELS[currentTab] || currentTab) : "";
  const detailId = segments[1];

  const isOverview = segments.length === 0;
  const isAreaPage = segments.length === 1;
  const isDetailPage = segments.length > 1;

  // Fetch detail name for breadcrumb on detail pages
  const teamMember = useQuery(
    api.teamMembers.get,
    isDetailPage && currentTab === "team" && detailId
      ? { id: detailId as Id<"teamMembers"> }
      : "skip"
  );
  const candidate = useQuery(
    api.candidates.get,
    isDetailPage && currentTab === "hiring" && detailId
      ? { id: detailId as Id<"hiringCandidates"> }
      : "skip"
  );

  const detailName =
    currentTab === "team" ? teamMember?.name :
    currentTab === "hiring" ? candidate?.name :
    null;

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              Roles
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          {isOverview ? (
            <BreadcrumbPage>{role?.title || "..."}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to={`/roles/${roleId}`}>
                {role?.title || "..."}
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {(isAreaPage || isDetailPage) && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isDetailPage ? (
                <BreadcrumbLink asChild>
                  <Link to={`/roles/${roleId}/${currentTab}`}>
                    {tabLabel}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{tabLabel}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}

        {isDetailPage && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{detailName || "..."}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

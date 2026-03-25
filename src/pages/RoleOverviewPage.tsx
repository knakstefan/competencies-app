import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartNetwork, Users, UserPlus, FileText, Loader2, ChevronRight } from "lucide-react";

const areas = [
  {
    key: "competencies",
    label: "Competencies",
    description: "Define and manage the skill framework across career levels.",
    icon: ChartNetwork,
    stat: (s: Stats) => `${s.competencyCount} ${s.competencyCount === 1 ? "competency" : "competencies"}`,
  },
  {
    key: "team",
    label: "Team",
    description: "Assess team members and track growth over time.",
    icon: Users,
    stat: (s: Stats) => `${s.memberCount} ${s.memberCount === 1 ? "member" : "members"}`,
  },
  {
    key: "hiring",
    label: "Hiring",
    description: "Evaluate candidates against the competency framework.",
    icon: UserPlus,
    stat: (s: Stats) => `${s.candidateCount} ${s.candidateCount === 1 ? "candidate" : "candidates"}`,
  },
] as const;

type Stats = { competencyCount: number; memberCount: number; candidateCount: number };

const RoleOverviewPage = () => {
  const { role, roleId } = useRole();
  const stats = useQuery(api.roles.getWithStats, { id: roleId });

  if (stats === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 animate-fade-up">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold gradient-heading">{role?.title}</h1>
              <Badge
                variant={role?.type === "ic" ? "secondary" : "default"}
                className={`text-xs shrink-0 ${
                  role?.type === "management" ? "bg-primary/10 text-primary" : ""
                }`}
              >
                {role?.type === "ic" ? "IC" : "Management"}
              </Badge>
              {stats && (
                <div className="hidden sm:inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-card/60 ring-1 ring-border/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ChartNetwork className="w-3 h-3 text-primary/70" />
                    {stats.competencyCount}
                  </span>
                  <div className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {stats.memberCount}
                  </span>
                  <div className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    {stats.candidateCount}
                  </span>
                </div>
              )}
            </div>
            {role?.description && (
              <p className="text-sm text-muted-foreground max-w-lg">{role.description}</p>
            )}
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="job-description" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Job Description
            </Link>
          </Button>
        </div>

        {/* Area navigation */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-card/40">
            {areas.map((area, index) => {
              const Icon = area.icon;
              return (
                <Link
                  key={area.key}
                  to={area.key}
                  className={`group relative flex items-center gap-4 px-4 py-4 border-l-2 border-l-transparent transition-all duration-200 hover:bg-primary/[0.03] ${
                    index > 0 ? "border-t border-border/30" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>

                  {/* Label + description */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{area.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{area.description}</p>
                  </div>

                  {/* Stat */}
                  {stats && (
                    <span className="hidden sm:block text-xs text-muted-foreground shrink-0">
                      {area.stat(stats)}
                    </span>
                  )}

                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleOverviewPage;

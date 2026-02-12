import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent } from "@/components/ui/card";
import { ChartNetwork, Users, UserPlus, Loader2 } from "lucide-react";

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
      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">{role?.title}</h1>
          {role?.description && (
            <p className="text-muted-foreground max-w-md mx-auto">{role.description}</p>
          )}
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ChartNetwork className="w-3.5 h-3.5 text-primary/70" />
                {stats.competencyCount} {stats.competencyCount === 1 ? "Competency" : "Competencies"}
              </span>
              <div className="w-px h-3.5 bg-border" />
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {stats.memberCount} {stats.memberCount === 1 ? "Member" : "Members"}
              </span>
              <div className="w-px h-3.5 bg-border" />
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                {stats.candidateCount} {stats.candidateCount === 1 ? "Candidate" : "Candidates"}
              </span>
            </div>
          </div>
        )}

        {/* Area cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {areas.map((area, index) => {
            const Icon = area.icon;
            return (
              <Link
                key={area.key}
                to={area.key}
                className="block animate-fade-up group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 h-full">
                  <div className="h-0.5 bg-gradient-knak" />
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold mb-1">{area.label}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{area.description}</p>

                    {stats && (
                      <div className="mt-auto pt-4 border-t border-border/50 text-sm text-muted-foreground">
                        {area.stat(stats)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoleOverviewPage;

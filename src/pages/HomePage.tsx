import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleCard } from "@/components/RoleCard";
import { CreateRoleDialog } from "@/components/CreateRoleDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartNetwork,
  Users,
  UserPlus,
  Loader2,
  Plus,
  Clock,
  Check,
  ArrowRight,
  AlertCircle,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function needsAttention(lastDate: string | null): boolean {
  if (!lastDate) return true;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSince > 90;
}

const HomePage = () => {
  const { isAdmin } = useAuth();
  const dashboard = useQuery(api.dashboard.stats);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const navigate = useNavigate();

  if (dashboard === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { totals, teamSnapshot, hiringPipeline, roles } = dashboard;

  // Sort team by attention needed: never assessed first, then oldest assessment
  const sortedTeam = [...teamSnapshot].sort((a, b) => {
    if (!a.lastAssessmentDate && b.lastAssessmentDate) return -1;
    if (a.lastAssessmentDate && !b.lastAssessmentDate) return 1;
    if (!a.lastAssessmentDate && !b.lastAssessmentDate)
      return a.name.localeCompare(b.name);
    return (a.lastAssessmentDate || "").localeCompare(b.lastAssessmentDate || "");
  });

  const attentionCount = teamSnapshot.filter((m) =>
    needsAttention(m.lastAssessmentDate)
  ).length;

  // Empty state: no roles at all
  if (roles.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[70vh]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[700px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
              mask: "radial-gradient(ellipse 50% 40% at 50% 45%, black 0%, transparent 100%)",
              WebkitMask:
                "radial-gradient(ellipse 50% 40% at 50% 45%, black 0%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          <div
            className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-card flex items-center justify-center ring-1 ring-border animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>

          <h1
            className="text-4xl font-bold tracking-tight mb-3 animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            Create your first{" "}
            <span className="gradient-heading">role</span>
          </h1>

          <p
            className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto mb-10 animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Roles define competency frameworks for your team. Start by creating
            a role to map skills across career levels.
          </p>

          {isAdmin && (
            <div
              className="animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <Button
                onClick={() => setRoleDialogOpen(true)}
                size="lg"
                className="rounded-full px-8 h-12 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Role
              </Button>
            </div>
          )}
        </div>

        <CreateRoleDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          existingCount={0}
        />
      </div>
    );
  }

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3 animate-fade-up">
          <h1 className="text-4xl font-bold gradient-heading">
            Your Team
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Assess, grow, and hire across your competency frameworks.
          </p>
        </div>

        {/* Stats pill */}
        <div
          className="flex items-center justify-center animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ChartNetwork className="w-3.5 h-3.5 text-primary/70" />
              {totals.roles} {totals.roles === 1 ? "Role" : "Roles"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {totals.members} {totals.members === 1 ? "Member" : "Members"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              {totals.activeCandidates} Active{" "}
              {totals.activeCandidates === 1 ? "Candidate" : "Candidates"}
            </span>
            {totals.hiredCount > 0 && (
              <>
                <div className="w-px h-3.5 bg-border" />
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {totals.hiredCount} Hired
                </span>
              </>
            )}
          </div>
        </div>

        {/* Two-column: Team Snapshot | Hiring Pipeline */}
        {(teamSnapshot.length > 0 || hiringPipeline.length > 0) && (
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            {/* Team Snapshot */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary/70" />
                  Team
                  {attentionCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {attentionCount} need{attentionCount === 1 ? "s" : ""}{" "}
                      review
                    </Badge>
                  )}
                </h2>
              </div>

              {teamSnapshot.length === 0 ? (
                <Card className="relative overflow-hidden">
                  <div className="h-0.5 bg-gradient-knak" />
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      No team members yet.
                    </p>
                    {isAdmin && roles.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/roles/${roles[0]._id}/team`)
                        }
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add Member
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="relative overflow-hidden">
                  <div className="h-0.5 bg-gradient-knak" />
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {sortedTeam.slice(0, 8).map((member) => {
                        const attention = needsAttention(
                          member.lastAssessmentDate
                        );
                        return (
                          <Link
                            key={member._id}
                            to={
                              member.roleId
                                ? `/roles/${member.roleId}/team/${member._id}`
                                : "#"
                            }
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                          >
                            {/* Avatar initial */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                attention
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Name + role */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {member.name}
                                </span>
                                {attention && (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="truncate">
                                  {member.level}
                                </span>
                                {member.roleTitle && (
                                  <>
                                    <span className="text-border">·</span>
                                    <span className="truncate">
                                      {member.roleTitle}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Assessment status */}
                            <div className="text-right shrink-0">
                              {member.hasInProgress ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs gap-1 font-normal"
                                >
                                  <Clock className="w-3 h-3" />
                                  In Progress
                                </Badge>
                              ) : member.lastAssessmentDate ? (
                                <span className="text-xs text-muted-foreground">
                                  {timeAgo(member.lastAssessmentDate)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">
                                  Never assessed
                                </span>
                              )}
                            </div>

                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </Link>
                        );
                      })}
                    </div>

                    {teamSnapshot.length > 8 && (
                      <div className="px-4 py-2.5 border-t border-border/50 text-center">
                        <span className="text-xs text-muted-foreground">
                          +{teamSnapshot.length - 8} more members
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Hiring Pipeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary/70" />
                  Pipeline
                  {hiringPipeline.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {hiringPipeline.length} active
                    </Badge>
                  )}
                </h2>
              </div>

              {hiringPipeline.length === 0 ? (
                <Card className="relative overflow-hidden">
                  <div className="h-0.5 bg-gradient-knak" />
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      No active candidates.
                    </p>
                    {isAdmin && roles.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/roles/${roles[0]._id}/hiring`)
                        }
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add Candidate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="relative overflow-hidden">
                  <div className="h-0.5 bg-gradient-knak" />
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {hiringPipeline.slice(0, 8).map((candidate) => (
                        <Link
                          key={candidate._id}
                          to={
                            candidate.roleId
                              ? `/roles/${candidate.roleId}/hiring/${candidate._id}`
                              : "#"
                          }
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                        >
                          {/* Avatar initial */}
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {candidate.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Name + target role */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {candidate.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="truncate">
                                {candidate.targetRole}
                              </span>
                              {candidate.roleTitle && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="truncate">
                                    {candidate.roleTitle}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Stage + assessment status */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              {candidate.stageName}
                            </Badge>
                            {candidate.isAssessed ? (
                              <div className="flex items-center gap-1">
                                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                                {candidate.score != null && (
                                  <span className="text-xs text-muted-foreground">
                                    {candidate.score.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">
                                Pending
                              </span>
                            )}
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </Link>
                      ))}
                    </div>

                    {hiringPipeline.length > 8 && (
                      <div className="px-4 py-2.5 border-t border-border/50 text-center">
                        <span className="text-xs text-muted-foreground">
                          +{hiringPipeline.length - 8} more candidates
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Roles Section */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase flex items-center gap-2">
              <ChartNetwork className="w-4 h-4 text-primary/70" />
              Roles
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role, index) => (
              <RoleCard
                key={role._id}
                role={role}
                index={index}
                isAdmin={isAdmin}
              />
            ))}

            {isAdmin && (
              <button
                onClick={() => setRoleDialogOpen(true)}
                className="animate-fade-up group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/40 p-8 text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02] min-h-[200px]"
                style={{ animationDelay: `${roles.length * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-lg border border-dashed border-current flex items-center justify-center transition-colors group-hover:border-primary/40">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Create Role</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <CreateRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        existingCount={roles.length}
      />
    </div>
  );
};

export default HomePage;

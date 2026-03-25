import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleCard } from "@/components/RoleCard";
import { CreateRoleDialog } from "@/components/CreateRoleDialog";
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
  ChevronRight,
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
                size="sm"
                className="rounded-full px-4 h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
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
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 animate-fade-up">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-heading">Dashboard</h1>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-card/60 ring-1 ring-border/50 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ChartNetwork className="w-3 h-3 text-primary/70" />
                {totals.roles}
              </span>
              <div className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                {totals.members}
              </span>
              <div className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3 h-3" />
                {totals.activeCandidates}
              </span>
              {totals.hiredCount > 0 && (
                <>
                  <div className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3 h-3" />
                    {totals.hiredCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Two-column: Team Snapshot | Hiring Pipeline */}
        {(teamSnapshot.length > 0 || hiringPipeline.length > 0) && (
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            {/* Team Snapshot */}
            <div>
              <div className="flex items-center gap-3 mb-6 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Team
                </span>
                {attentionCount > 0 && (
                  <Badge variant="secondary" className="text-[11px] h-5 px-1.5 font-normal">
                    {attentionCount} need{attentionCount === 1 ? "s" : ""} review
                  </Badge>
                )}
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[11px] text-muted-foreground/50">{teamSnapshot.length}</span>
              </div>

              {teamSnapshot.length === 0 ? (
                <div className="rounded-xl ring-1 ring-border/50 bg-card/40 p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No team members yet.</p>
                  {isAdmin && roles.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/roles/${roles[0]._id}/team`)}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-card/40">
                  {sortedTeam.slice(0, 8).map((member, idx) => {
                    const attention = needsAttention(member.lastAssessmentDate);
                    return (
                      <Link
                        key={member._id}
                        to={member.roleId ? `/roles/${member.roleId}/team/${member._id}` : "#"}
                        className={`group relative flex items-center gap-3 px-4 py-3 border-l-2 transition-all duration-200 hover:bg-primary/[0.03] ${
                          attention ? "border-l-amber-500/40" : "border-l-transparent"
                        } ${idx > 0 ? "border-t border-border/30" : ""}`}
                      >
                        {/* Status dot */}
                        <span className={`block w-2 h-2 rounded-full shrink-0 ${
                          attention ? "bg-amber-500 animate-pulse" : "bg-green-500"
                        }`} />

                        {/* Name + level */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{member.name}</span>
                            {attention && <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="truncate">{member.level}</span>
                            {member.roleTitle && (
                              <>
                                <span className="text-border">·</span>
                                <span className="truncate">{member.roleTitle}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Assessment status */}
                        <div className="text-right shrink-0">
                          {member.hasInProgress ? (
                            <Badge variant="outline" className="text-[11px] h-5 gap-1 font-normal">
                              <Clock className="w-3 h-3" />
                              In Progress
                            </Badge>
                          ) : member.lastAssessmentDate ? (
                            <span className="text-xs text-muted-foreground">{timeAgo(member.lastAssessmentDate)}</span>
                          ) : (
                            <span className="text-[11px] text-amber-500/70">Never assessed</span>
                          )}
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                      </Link>
                    );
                  })}

                  {teamSnapshot.length > 8 && (
                    <div className="px-4 py-2 border-t border-border/30 text-center">
                      <span className="text-[11px] text-muted-foreground/50">+{teamSnapshot.length - 8} more</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hiring Pipeline */}
            <div>
              <div className="flex items-center gap-3 mb-6 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                  <UserPlus className="w-3 h-3" />
                  Pipeline
                </span>
                {hiringPipeline.length > 0 && (
                  <Badge variant="secondary" className="text-[11px] h-5 px-1.5 font-normal">
                    {hiringPipeline.length} active
                  </Badge>
                )}
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[11px] text-muted-foreground/50">{hiringPipeline.length}</span>
              </div>

              {hiringPipeline.length === 0 ? (
                <div className="rounded-xl ring-1 ring-border/50 bg-card/40 p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No active candidates.</p>
                  {isAdmin && roles.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/roles/${roles[0]._id}/hiring`, { state: { openAddCandidate: true } })}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Candidate
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-card/40">
                  {hiringPipeline.slice(0, 8).map((candidate, idx) => (
                    <Link
                      key={candidate._id}
                      to={candidate.roleId ? `/roles/${candidate.roleId}/hiring/${candidate._id}` : "#"}
                      className={`group relative flex items-center gap-3 px-4 py-3 border-l-2 border-l-transparent transition-all duration-200 hover:bg-primary/[0.03] ${
                        idx > 0 ? "border-t border-border/30" : ""
                      }`}
                    >
                      {/* Status dot */}
                      <span className={`block w-2 h-2 rounded-full shrink-0 ${
                        candidate.isAssessed ? "bg-green-500" : "bg-muted-foreground/30 animate-pulse"
                      }`} />

                      {/* Name + target role */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{candidate.name}</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="truncate">{candidate.targetRole}</span>
                          {candidate.roleTitle && (
                            <>
                              <span className="text-border">·</span>
                              <span className="truncate">{candidate.roleTitle}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stage + assessment */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-normal">
                          {candidate.stageName}
                        </Badge>
                        {candidate.isAssessed ? (
                          <div className="flex items-center gap-1">
                            <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                            {candidate.score != null && (
                              <span className="text-xs text-muted-foreground">{candidate.score.toFixed(1)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">Pending</span>
                        )}
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                    </Link>
                  ))}

                  {hiringPipeline.length > 8 && (
                    <div className="px-4 py-2 border-t border-border/30 text-center">
                      <span className="text-[11px] text-muted-foreground/50">+{hiringPipeline.length - 8} more</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Roles Section */}
        <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center gap-3 mb-4 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
              <ChartNetwork className="w-3 h-3" />
              Roles
            </span>
            <div className="flex-1 h-px bg-border/40" />
            {isAdmin && (
              <Button
                onClick={() => setRoleDialogOpen(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create Role
              </Button>
            )}
          </div>

          <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-card/40">
            {roles.map((role, index) => (
              <RoleCard
                key={role._id}
                role={role}
                index={index}
                isAdmin={isAdmin}
                isFirst={index === 0}
              />
            ))}
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

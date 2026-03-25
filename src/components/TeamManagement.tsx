import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { TeamMemberForm } from "./TeamMemberForm";
import { TeamSkillMapping } from "./TeamSkillMapping";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Users,
  MoreVertical,
  SlidersVertical,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  ClipboardCheck,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useRoleLevels } from "@/hooks/useRoleLevels";

interface TeamMember {
  _id: Id<"teamMembers">;
  name: string;
  role: string;
  startDate: string;
  _creationTime: number;
  assessmentCount: number;
  lastAssessedAt: string | null;
}

interface TeamManagementProps {
  isAdmin: boolean;
  roleId?: Id<"roles">;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const TeamManagement = ({ isAdmin, roleId }: TeamManagementProps) => {
  const { levels } = useRoleLevels(roleId);
  const navigate = useNavigate();
  const teamMembers = useQuery(
    roleId ? api.teamMembers.listWithAssessmentSummaryByRole : api.teamMembers.listWithAssessmentSummary,
    roleId ? { roleId } : {}
  );
  const removeMember = useMutation(api.teamMembers.remove);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const loading = teamMembers === undefined;

  const handleDelete = async () => {
    if (!deletingMember) return;

    try {
      await removeMember({ id: deletingMember._id });
      toast({
        title: "Success",
        description: "Team member deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete team member",
        variant: "destructive",
      });
    }
    setDeletingMember(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const memberList = teamMembers || [];
  const assessedCount = memberList.filter((m) => m.assessmentCount > 0).length;

  // Empty state
  if (memberList.length === 0) {
    return (
      <>
        <div className="relative flex flex-col items-center justify-center min-h-[60vh]">
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
              Add your first{" "}
              <span className="gradient-heading">team member</span>
            </h1>

            <p
              className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto mb-10 animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              Track competency growth across career levels and generate AI-powered progression plans.
            </p>

            {isAdmin && (
              <div
                className="animate-fade-up"
                style={{ animationDelay: "240ms" }}
              >
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size="lg"
                  className="rounded-full px-8 h-12 text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Team Member
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingMember(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <TeamMemberForm
              onSuccess={() => {
                setEditingMember(null);
                setIsDialogOpen(false);
              }}
              editingMember={null}
              onCancel={() => {
                setEditingMember(null);
                setIsDialogOpen(false);
              }}
              roleId={roleId}
              levels={levels}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Assessment status: green (recent <90d), amber (stale >90d), unassessed
  const getAssessmentStatus = (member: TeamMember) => {
    if (member.assessmentCount === 0) return "unassessed";
    if (!member.lastAssessedAt) return "stale";
    const daysSince = (Date.now() - new Date(member.lastAssessedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 90 ? "stale" : "current";
  };

  const statusDot = (status: string) => {
    if (status === "current") return "bg-green-500";
    if (status === "stale") return "bg-amber-500";
    return "bg-muted-foreground/30";
  };

  const statusBorder = (status: string) => {
    if (status === "unassessed") return "border-l-amber-500/40";
    return "border-l-transparent";
  };

  // Group members by level for section dividers
  const levelLabels = levels.map((l: any) => l.label);
  const sortedMembers = [...memberList].sort((a, b) => {
    const aIdx = levelLabels.indexOf(a.role);
    const bIdx = levelLabels.indexOf(b.role);
    if (aIdx !== bIdx) return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    return a.name.localeCompare(b.name);
  });

  // Build grouped structure
  const groups: { level: string; members: TeamMember[] }[] = [];
  let currentGroup: { level: string; members: TeamMember[] } | null = null;
  for (const member of sortedMembers) {
    if (!currentGroup || currentGroup.level !== member.role) {
      currentGroup = { level: member.role, members: [] };
      groups.push(currentGroup);
    }
    currentGroup.members.push(member);
  }

  // Populated state
  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 animate-fade-up">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-heading">Team</h1>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-card/60 ring-1 ring-border/50 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-primary/70" />
                {memberList.length}
              </span>
              <div className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="w-3 h-3" />
                {assessedCount} assessed
              </span>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="sm"
              className="rounded-full px-4 h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Member
            </Button>
          )}
        </div>

        {/* Main content with sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Member list */}
          <div className="space-y-6 content-start">
            {groups.map((group, gIdx) => (
              <div key={group.level} className="animate-fade-up" style={{ animationDelay: `${gIdx * 100}ms` }}>
                {/* Level group header */}
                <div className="flex items-center gap-3 mb-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.level}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[11px] text-muted-foreground/50">
                    {group.members.length}
                  </span>
                </div>

                {/* Member rows */}
                <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-card/40">
                  {group.members.map((member, mIdx) => {
                    const status = getAssessmentStatus(member);
                    return (
                      <div
                        key={member._id}
                        className={`group relative border-l-2 ${statusBorder(status)} transition-all duration-200 cursor-pointer hover:bg-primary/[0.03] ${
                          mIdx > 0 ? "border-t border-border/30" : ""
                        }`}
                        onClick={() => navigate(`/roles/${roleId}/team/${member._id}`)}
                      >
                        <div className="flex items-center gap-4 px-4 py-3.5">
                          {/* Status dot */}
                          <div className="shrink-0">
                            <span className={`block w-2 h-2 rounded-full ${statusDot(status)} ${status === "unassessed" ? "animate-pulse" : ""}`} />
                          </div>

                          {/* Name + level */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {member.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Started {formatDate(member.startDate)}
                              </span>
                            </div>
                          </div>

                          {/* Assessment info */}
                          <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                            {member.assessmentCount > 0 ? (
                              <>
                                <Badge variant="secondary" className="text-[11px] h-5 px-2">
                                  {member.assessmentCount} assessment{member.assessmentCount !== 1 ? "s" : ""}
                                </Badge>
                                {member.lastAssessedAt && (
                                  <span className="text-muted-foreground/70">
                                    {formatDate(member.lastAssessedAt)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-amber-500/70 text-[11px]">Not assessed</span>
                            )}
                          </div>

                          {/* Actions + chevron */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/roles/${roleId}/team/${member._id}`)}>
                                    <SlidersVertical className="h-4 w-4 mr-2" />
                                    Assessment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingMember(member);
                                      setIsDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingMember(member)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                          </div>
                        </div>

                        {/* Mobile-only assessment info */}
                        <div className="sm:hidden px-4 pb-3 pl-10 flex items-center gap-2 text-xs text-muted-foreground">
                          {member.assessmentCount > 0 ? (
                            <>
                              <Badge variant="secondary" className="text-[11px] h-5 px-2">
                                {member.assessmentCount} assessment{member.assessmentCount !== 1 ? "s" : ""}
                              </Badge>
                              {member.lastAssessedAt && (
                                <span className="text-muted-foreground/70">{formatDate(member.lastAssessedAt)}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-amber-500/70 text-[11px]">Not assessed</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right sidebar: Team Skill Mapping */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <TeamSkillMapping roleId={roleId} />
          </div>
        </div>
      </div>

      {/* Form dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingMember(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <TeamMemberForm
            onSuccess={() => {
              setEditingMember(null);
              setIsDialogOpen(false);
            }}
            editingMember={editingMember}
            onCancel={() => {
              setEditingMember(null);
              setIsDialogOpen(false);
            }}
            roleId={roleId}
            levels={levels}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingMember?.name}? This action cannot be undone and will remove all
              progress tracking for this member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

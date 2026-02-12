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
} from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

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
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Populated state
  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">Team</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Assess team members and track growth over time.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary/70" />
              {memberList.length} {memberList.length === 1 ? "Member" : "Members"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" />
              {assessedCount} Assessed
            </span>
          </div>
        </div>

        {/* Skills Overview */}
        <TeamSkillMapping roleId={roleId} />

        {/* Member cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {memberList.map((member, index) => (
            <div
              key={member._id}
              className="animate-fade-up group"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                <div className="h-0.5 bg-gradient-knak" />
                <CardContent className="p-5 flex flex-col">
                  {/* Top row: role badge + actions */}
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                    <div className="flex items-center gap-1">
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
                    </div>
                  </div>

                  {/* Name */}
                  <h3
                    className="text-lg font-semibold mb-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/roles/${roleId}/team/${member._id}`)}
                  >
                    {member.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Started {formatDate(member.startDate)}
                  </p>

                  {/* Footer: assessment info */}
                  <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                    {member.assessmentCount > 0 ? (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          {member.assessmentCount} assessment{member.assessmentCount !== 1 ? "s" : ""}
                        </Badge>
                        {member.lastAssessedAt && (
                          <span className="text-xs">
                            Last: {formatDate(member.lastAssessedAt)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">Not yet assessed</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Add member card */}
          {isAdmin && (
            <button
              onClick={() => setIsDialogOpen(true)}
              className="animate-fade-up group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/40 p-8 text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02] min-h-[200px]"
              style={{ animationDelay: `${memberList.length * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-lg border border-dashed border-current flex items-center justify-center transition-colors group-hover:border-primary/40">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Add Team Member</span>
            </button>
          )}
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

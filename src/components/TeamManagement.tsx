import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { TeamMemberForm } from "./TeamMemberForm";
import { TeamMemberSkeleton } from "./skeletons/TeamMemberSkeleton";
import { TeamSkillMapping } from "./TeamSkillMapping";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, SlidersVertical, Plus, BarChart3, MoreVertical, Users } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

export const TeamManagement = ({ isAdmin }: TeamManagementProps) => {
  const navigate = useNavigate();
  const teamMembers = useQuery(api.teamMembers.listWithAssessmentSummary);
  const removeMember = useMutation(api.teamMembers.remove);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("skills");
  const { toast } = useToast();

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="skills" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Skills Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <TeamSkillMapping />
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              {isAdmin && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {teamMembers === undefined ? (
                <TeamMemberSkeleton />
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    No team members yet. {isAdmin && "Add your first team member above."}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Add team members to track their competency growth across levels and generate progression plans.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-start justify-between p-5 rounded-lg bg-muted/30 transition-all hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <h3
                          className="font-semibold cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/team/${member._id}`)}
                        >
                          {member.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-xs text-muted-foreground">Started: {formatDate(member.startDate)}</p>
                          {member.assessmentCount > 0 ? (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                {member.assessmentCount} assessment{member.assessmentCount !== 1 ? "s" : ""}
                              </Badge>
                              {member.lastAssessedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Last assessed: {formatDate(member.lastAssessedAt)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/70">Not yet assessed</span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-white bg-muted/30 hover:bg-background border border-transparent hover:border-primary"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/team/${member._id}`)}>
                            <SlidersVertical className="h-4 w-4 mr-2" />
                            Assessment
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
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
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
          />
        </DialogContent>
      </Dialog>

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

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { TeamMemberForm } from "./TeamMemberForm";
import { MemberProgressView } from "./MemberProgressView";
import { PromotionPlan } from "./PromotionPlan";
import { TeamMemberSkeleton } from "./skeletons/TeamMemberSkeleton";
import { TeamSkillMapping } from "./TeamSkillMapping";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, SlidersVertical, Plus, TrendingUp, BarChart3, ArrowLeft, MoreVertical, Users } from "lucide-react";
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
}

interface TeamManagementProps {
  isAdmin: boolean;
}

export const TeamManagement = ({ isAdmin }: TeamManagementProps) => {
  const teamMembers = useQuery(api.teamMembers.list);
  const removeMember = useMutation(api.teamMembers.remove);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
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

  if (viewingMember) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-center text-center gap-4 relative">
          <Button variant="outline" className="absolute left-0 cursor-pointer" onClick={() => setViewingMember(null)}>
            <ArrowLeft className="h-8 w-8 mr-2" />
            Back
          </Button>

          <div>
            <h2 className="text-3xl font-bold">{viewingMember.name}</h2>
            <p className="text-muted-foreground">
              {viewingMember.role} • Started {formatDate(viewingMember.startDate)}
            </p>
          </div>
        </div>

        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
            <TabsTrigger value="progress" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Assessment
            </TabsTrigger>
            <TabsTrigger value="promotion" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Progression Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress">
            <MemberProgressView
              member={viewingMember}
              isAdmin={isAdmin}
            />
          </TabsContent>

          <TabsContent value="promotion">
            <PromotionPlan member={viewingMember} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

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
                <p className="text-muted-foreground">
                  No team members yet. {isAdmin && "Add your first team member above."}
                </p>
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
                          onClick={() => setViewingMember(member)}
                        >
                          {member.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                        <p className="text-xs text-muted-foreground mt-1">Started: {formatDate(member.startDate)}</p>
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
                          <DropdownMenuItem onClick={() => setViewingMember(member)}>
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

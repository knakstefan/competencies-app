import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ChartNetwork, MoreVertical, Pencil, Trash2, Users, UserPlus } from "lucide-react";
import { CreateRoleDialog, EditingRole } from "./CreateRoleDialog";

interface RoleCardProps {
  role: {
    _id: string;
    title: string;
    type: "ic" | "management";
    description?: string;
    competencyCount: number;
    memberCount: number;
    candidateCount: number;
  };
  index: number;
  isAdmin?: boolean;
}

export const RoleCard = ({ role, index, isAdmin }: RoleCardProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const removeMutation = useMutation(api.roles.remove);
  const { toast } = useToast();

  const dataCount = role.competencyCount + role.memberCount + role.candidateCount;

  const handleDelete = async () => {
    try {
      await removeMutation({ id: role._id as Id<"roles"> });
      toast({ title: "Deleted", description: `"${role.title}" and all associated data removed.` });
    } catch {
      toast({ title: "Error", description: "Failed to delete role", variant: "destructive" });
    }
  };

  const editingRole: EditingRole = {
    _id: role._id,
    title: role.title,
    type: role.type,
    description: role.description,
  };

  return (
    <>
      <Link
        to={`/roles/${role._id}`}
        className="block animate-fade-up group"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 h-full">
          {/* Gradient top border */}
          <div className="h-0.5 bg-gradient-knak" />

          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <Badge
                variant={role.type === "ic" ? "secondary" : "default"}
                className={
                  role.type === "management"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : ""
                }
              >
                {role.type === "ic" ? "IC" : "Management"}
              </Badge>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-2">{role.title}</h3>

            {role.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {role.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto pt-4 border-t border-border/50">
              <span className="flex items-center gap-1.5">
                <ChartNetwork className="w-3.5 h-3.5" />
                {role.competencyCount}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {role.memberCount}
              </span>
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                {role.candidateCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      <CreateRoleDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existingCount={0}
        editingRole={editingRole}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{role.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this role and all associated data
              {dataCount > 0 && (
                <> — {role.competencyCount} {role.competencyCount === 1 ? "competency" : "competencies"}, {role.memberCount} team {role.memberCount === 1 ? "member" : "members"}, and {role.candidateCount} {role.candidateCount === 1 ? "candidate" : "candidates"}</>
              )}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

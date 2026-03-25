import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ChartNetwork, ChevronRight, MoreVertical, Pencil, Trash2, Users, UserPlus } from "lucide-react";
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
  isFirst?: boolean;
}

export const RoleCard = ({ role, index, isAdmin, isFirst }: RoleCardProps) => {
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
        className={`group relative flex items-center gap-4 px-4 py-3.5 border-l-2 border-l-transparent transition-all duration-200 hover:bg-primary/[0.03] ${
          !isFirst ? "border-t border-border/30" : ""
        }`}
      >
        {/* Type badge */}
        <Badge
          variant={role.type === "ic" ? "secondary" : "default"}
          className={`text-[11px] h-5 px-1.5 shrink-0 ${
            role.type === "management"
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : ""
          }`}
        >
          {role.type === "ic" ? "IC" : "Mgmt"}
        </Badge>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate block">
            {role.title}
          </span>
          {role.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {role.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1">
            <ChartNetwork className="w-3 h-3" />
            {role.competencyCount}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {role.memberCount}
          </span>
          <span className="flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            {role.candidateCount}
          </span>
        </div>

        {/* Actions + chevron */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
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
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
        </div>
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

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserManagementProps {
  isAdmin: boolean;
}

export const UserManagement = ({ isAdmin }: UserManagementProps) => {
  const users = useQuery(api.users.listAll);
  const updateRole = useMutation(api.users.updateRole);
  const inviteUser = useAction(api.userAdmin.inviteUser);
  const deleteUser = useAction(api.userAdmin.deleteUser);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const loading = users === undefined;

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      await inviteUser({
        email: inviteEmail,
        role: inviteRole as "admin" | "editor" | "viewer",
      });

      toast({
        title: "User invited",
        description: `Invitation sent to ${inviteEmail}`,
      });

      setInviteEmail("");
      setInviteRole("viewer");
      setInviteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error inviting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditRole = async () => {
    if (!editingUser) return;

    try {
      await updateRole({
        id: editingUser._id as Id<"users">,
        role: editRole as "admin" | "editor" | "viewer",
      });

      toast({
        title: "Role updated",
        description: `User role changed to ${editRole}`,
      });

      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      await deleteUser({ userId: deletingUser._id as Id<"users"> });

      toast({
        title: "User deleted",
        description: "User has been removed from the system",
      });

      setDeletingUser(null);
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You do not have permission to manage users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-lg bg-muted/30">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation email to a new user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {(users || []).map((user) => (
          <div
            key={user._id}
            className="flex items-center justify-between p-5 rounded-lg bg-card border"
          >
            <div className="flex-1">
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Joined {new Date(user._creationTime).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">
                  {user.role}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setEditingUser(user);
                  setEditRole(user.role || "viewer");
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setDeletingUser(user)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingUser?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

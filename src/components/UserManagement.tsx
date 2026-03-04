import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Trash2,
  Pencil,
  Loader2,
  Users,
  Shield,
  ShieldCheck,
  Eye,
  Sparkles,
  Plus,
} from "lucide-react";

interface UserManagementProps {
  isAdmin: boolean;
}

const roleBadge = (role: string) => {
  switch (role) {
    case "admin":
      return { label: "Admin", icon: ShieldCheck, className: "bg-primary/10 text-primary hover:bg-primary/20" };
    case "editor":
      return { label: "Editor", icon: Shield, className: "" };
    default:
      return { label: "Viewer", icon: Eye, className: "" };
  }
};

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
      toast({ title: "Email required", description: "Please enter an email address", variant: "destructive" });
      return;
    }

    try {
      await inviteUser({ email: inviteEmail, role: inviteRole as "admin" | "editor" | "viewer" });
      toast({ title: "User invited", description: `Invitation sent to ${inviteEmail}` });
      setInviteEmail("");
      setInviteRole("viewer");
      setInviteDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error inviting user", description: error.message, variant: "destructive" });
    }
  };

  const handleEditRole = async () => {
    if (!editingUser) return;
    try {
      await updateRole({ id: editingUser._id as Id<"users">, role: editRole as "admin" | "editor" | "viewer" });
      toast({ title: "Role updated", description: `User role changed to ${editRole}` });
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast({ title: "Error updating role", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser({ userId: deletingUser._id as Id<"users"> });
      toast({ title: "User deleted", description: "User has been removed from the system" });
      setDeletingUser(null);
    } catch (error: any) {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userList = users || [];
  const adminCount = userList.filter((u) => u.role === "admin").length;
  const editorCount = userList.filter((u) => u.role === "editor").length;
  const viewerCount = userList.filter((u) => u.role === "viewer").length;

  // Empty state
  if (userList.length === 0) {
    return (
      <div className="ambient-glow">
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-4xl font-bold gradient-heading">Members</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Manage who has access to your competency frameworks.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No members yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Invite team members to collaborate on competency assessments.
            </p>
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </div>
        </div>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>Send an invitation email to a new user.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Populated state
  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">Members</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Manage who has access to your competency frameworks.
          </p>
        </div>

        {/* Stats pill */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary/70" />
              {userList.length} {userList.length === 1 ? "Member" : "Members"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {adminCount} {adminCount === 1 ? "Admin" : "Admins"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span>{editorCount} {editorCount === 1 ? "Editor" : "Editors"}</span>
            <div className="w-px h-3.5 bg-border" />
            <span>{viewerCount} {viewerCount === 1 ? "Viewer" : "Viewers"}</span>
          </div>
        </div>

        {/* User list */}
        <div className="space-y-3">
          {userList.map((user, index) => {
            const badge = roleBadge(user.role);
            const Icon = badge.icon;
            return (
              <div
                key={user._id}
                className="animate-fade-up group"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Card className="relative overflow-hidden">
                  <div className="h-0.5 bg-gradient-knak" />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {user.email.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium truncate">{user.email}</span>
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            className={`text-xs shrink-0 gap-1 ${badge.className}`}
                          >
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user._creationTime).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingUser(user);
                            setEditRole(user.role || "viewer");
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Invite button */}
          <button
            onClick={() => setInviteDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/40 p-4 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02]"
          >
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>Send an invitation email to a new user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>Change the role for {editingUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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

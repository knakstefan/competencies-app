import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCount: number;
}

export const CreateRoleDialog = ({
  open,
  onOpenChange,
  existingCount,
}: CreateRoleDialogProps) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"ic" | "management">("ic");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const createRole = useMutation(api.roles.create);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createRole({
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        orderIndex: existingCount + 1,
      });

      toast({
        title: "Success",
        description: "Role created successfully",
      });

      setTitle("");
      setType("ic");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>
            Define a new role with its own competencies, team, and hiring pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-title"
              placeholder="e.g., Product Designer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(val) => {
                if (val) setType(val as "ic" | "management");
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="ic" className="px-6">
                IC
              </ToggleGroupItem>
              <ToggleGroupItem value="management" className="px-6">
                Management
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              placeholder="Brief description of this role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

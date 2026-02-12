import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "../../convex/_generated/dataModel";

const teamMemberSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100, "Name must be less than 100 characters"),
  role: z.string().trim().min(1, "Role cannot be empty").max(100, "Role must be less than 100 characters"),
  startDate: z.string().min(1, "Start date is required"),
});

interface TeamMemberFormProps {
  onSuccess: () => void;
  editingMember?: {
    _id: Id<"teamMembers">;
    name: string;
    role: string;
    startDate: string;
  } | null;
  onCancel?: () => void;
}

export const TeamMemberForm = ({ onSuccess, editingMember, onCancel }: TeamMemberFormProps) => {
  const [name, setName] = useState(editingMember?.name || "");
  const [role, setRole] = useState(editingMember?.role || "");
  const [startDate, setStartDate] = useState(editingMember?.startDate || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createMember = useMutation(api.teamMembers.create);
  const updateMember = useMutation(api.teamMembers.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = teamMemberSchema.parse({
        name,
        role,
        startDate,
      });

      if (editingMember) {
        await updateMember({
          id: editingMember._id,
          name: validated.name,
          role: validated.role,
          startDate: validated.startDate,
        });

        toast({
          title: "Success",
          description: "Team member updated successfully",
        });
      } else {
        await createMember({
          name: validated.name,
          role: validated.role,
          startDate: validated.startDate,
        });

        toast({
          title: "Success",
          description: "Team member added successfully",
        });
      }

      setName("");
      setRole("");
      setStartDate("");
      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to ${editingMember ? "update" : "add"} team member`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team member name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Level</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Associate">Associate</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Principal">Principal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {editingMember ? "Update" : "Add"} Member
            </Button>
            {editingMember && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
  );
};

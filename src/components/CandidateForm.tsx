import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HiringCandidate } from "./HiringManagement";
import { RoleLevel, FALLBACK_LEVELS, getLevelOptions } from "@/lib/levelUtils";

interface CandidateFormProps {
  editingCandidate: HiringCandidate | null;
  onSuccess: () => void;
  onCancel: () => void;
  roleId?: string;
  levels?: RoleLevel[];
}

export const CandidateForm = ({ editingCandidate, onSuccess, onCancel, roleId, levels = FALLBACK_LEVELS }: CandidateFormProps) => {
  const [name, setName] = useState(editingCandidate?.name || "");
  const [email, setEmail] = useState(editingCandidate?.email || "");
  const [portfolioUrl, setPortfolioUrl] = useState(editingCandidate?.portfolioUrl || "");
  const [targetRole, setTargetRole] = useState(editingCandidate?.targetRole || "Associate");
  const [notes, setNotes] = useState(editingCandidate?.notes || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createCandidate = useMutation(api.candidates.create);
  const updateCandidate = useMutation(api.candidates.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (editingCandidate) {
        await updateCandidate({
          id: editingCandidate._id as Id<"hiringCandidates">,
          name: name.trim(),
          email: email.trim() || undefined,
          portfolioUrl: portfolioUrl.trim() || undefined,
          targetRole,
          notes: notes.trim() || undefined,
        });
      } else {
        await createCandidate({
          name: name.trim(),
          email: email.trim() || undefined,
          portfolioUrl: portfolioUrl.trim() || undefined,
          targetRole,
          notes: notes.trim() || undefined,
          ...(roleId ? { roleId: roleId as any } : {}),
        });
      }

      toast({
        title: "Success",
        description: `Candidate ${editingCandidate ? "updated" : "added"} successfully`,
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingCandidate ? "update" : "add"} candidate`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter candidate name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="candidate@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio">Portfolio URL</Label>
        <Input
          id="portfolio"
          type="url"
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          placeholder="https://portfolio.example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetRole">Target Role</Label>
        <Select value={targetRole} onValueChange={setTargetRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select target role" />
          </SelectTrigger>
          <SelectContent>
            {getLevelOptions(levels).map((l) => (
              <SelectItem key={l.key} value={l.label}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about the candidate..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : editingCandidate ? "Update" : "Add Candidate"}
        </Button>
      </div>
    </form>
  );
};

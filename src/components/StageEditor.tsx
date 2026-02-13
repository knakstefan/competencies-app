import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
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
interface HiringStage {
  _id: string;
  roleId: string;
  title: string;
  description?: string;
  stageType: string;
  aiInstructions?: string;
  gateMinScore?: number;
  gateMinRatedPct?: number;
  orderIndex: number;
}

interface StageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: Id<"roles">;
  existingStage?: HiringStage | null;
  nextOrderIndex: number;
}

export const StageEditor = ({
  open,
  onOpenChange,
  roleId,
  existingStage,
  nextOrderIndex,
}: StageEditorProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [gateMinScore, setGateMinScore] = useState("");
  const [gateMinRatedPct, setGateMinRatedPct] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createStage = useMutation(api.hiringStages.create);
  const updateStage = useMutation(api.hiringStages.update);

  const isEditing = !!existingStage;

  useEffect(() => {
    if (open && existingStage) {
      setTitle(existingStage.title);
      setDescription(existingStage.description || "");
      setAiInstructions(existingStage.aiInstructions || "");
      setGateMinScore(existingStage.gateMinScore?.toString() || "");
      setGateMinRatedPct(existingStage.gateMinRatedPct?.toString() || "");
    } else if (open) {
      setTitle("");
      setDescription("");
      setAiInstructions("");
      setGateMinScore("");
      setGateMinRatedPct("");
    }
  }, [open, existingStage]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const minScore = gateMinScore ? parseFloat(gateMinScore) : undefined;
      const minPct = gateMinRatedPct ? parseFloat(gateMinRatedPct) : undefined;

      if (isEditing) {
        await updateStage({
          id: existingStage._id as Id<"hiringStages">,
          title: title.trim(),
          description: description.trim() || undefined,
          aiInstructions: aiInstructions.trim() || undefined,
          gateMinScore: minScore,
          gateMinRatedPct: minPct,
        });
        toast({ title: "Success", description: "Stage updated" });
      } else {
        await createStage({
          roleId,
          title: title.trim(),
          stageType: "ai_interview",
          description: description.trim() || undefined,
          aiInstructions: aiInstructions.trim() || undefined,
          gateMinScore: minScore,
          gateMinRatedPct: minPct,
          orderIndex: nextOrderIndex,
        });
        toast({ title: "Success", description: "Stage created" });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save stage",
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
          <DialogTitle>{isEditing ? "Edit Stage" : "Add Stage"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this pipeline stage." : "Add a new stage to the hiring pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stage-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stage-title"
              placeholder="e.g., Technical Assessment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage-description">Description</Label>
            <Textarea
              id="stage-description"
              placeholder="Brief description of this stage..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gate-min-score">Gate: Min Score (1.0–5.0)</Label>
              <Input
                id="gate-min-score"
                type="number"
                min={1}
                max={5}
                step={0.1}
                placeholder="e.g., 3.0"
                value={gateMinScore}
                onChange={(e) => setGateMinScore(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gate-min-pct">Gate: Min Rated %</Label>
              <Input
                id="gate-min-pct"
                type="number"
                min={0}
                max={100}
                step={5}
                placeholder="e.g., 80"
                value={gateMinRatedPct}
                onChange={(e) => setGateMinRatedPct(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-instructions">AI Instructions</Label>
            <Textarea
              id="ai-instructions"
              placeholder="Instructions for AI question generation. Describe what this interview should focus on, what skills to probe, or any specific context about the role. If left blank, AI will generate questions based on the role's competency framework."
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Stage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

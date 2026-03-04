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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GlobalLevel {
  _id: Id<"globalLevels">;
  type: "ic" | "management";
  key: string;
  label: string;
  description?: string;
  orderIndex: number;
}

interface LevelEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLevel?: GlobalLevel | null;
  levelType: "ic" | "management";
  nextOrderIndex: number;
  allLevels: GlobalLevel[];
}

export const LevelEditor = ({
  open,
  onOpenChange,
  existingLevel,
  levelType,
  nextOrderIndex,
  allLevels,
}: LevelEditorProps) => {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [copyFromKey, setCopyFromKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createLevel = useMutation(api.globalLevels.create);
  const updateLevel = useMutation(api.globalLevels.update);

  const isEditing = !!existingLevel;

  useEffect(() => {
    if (open && existingLevel) {
      setKey(existingLevel.key);
      setLabel(existingLevel.label);
      setDescription(existingLevel.description || "");
      setCopyFromKey("");
    } else if (open) {
      setKey("");
      setLabel("");
      setDescription("");
      setCopyFromKey("");
    }
  }, [open, existingLevel]);

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast({ title: "Error", description: "Label is required", variant: "destructive" });
      return;
    }
    if (!isEditing && !key.trim()) {
      toast({ title: "Error", description: "Key is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateLevel({
          id: existingLevel._id,
          label: label.trim(),
          description: description.trim() || undefined,
        });
        toast({ title: "Success", description: "Level updated" });
      } else {
        await createLevel({
          type: levelType,
          key: key.trim().toLowerCase().replace(/\s+/g, "_"),
          label: label.trim(),
          description: description.trim() || undefined,
          orderIndex: nextOrderIndex,
          copyFromKey: copyFromKey && copyFromKey !== "none" ? copyFromKey : undefined,
        });
        toast({ title: "Success", description: "Level created" });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save level",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Levels available for copy (same type)
  const copyOptions = allLevels.filter((l) => l.type === levelType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Level" : "Add Level"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this level. The key is immutable after creation."
              : `Add a new ${levelType === "ic" ? "IC" : "Management"} level. Changes propagate to all roles.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="level-key">
              Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="level-key"
              placeholder="e.g., p6_fellow"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isEditing}
              className={isEditing ? "opacity-60" : ""}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">Key cannot be changed after creation.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="level-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="level-label"
              placeholder="e.g., P6 Fellow"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level-description">Description</Label>
            <Textarea
              id="level-description"
              placeholder="Brief description of this level..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {!isEditing && copyOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="copy-from">Copy criteria from</Label>
              <Select value={copyFromKey} onValueChange={setCopyFromKey}>
                <SelectTrigger>
                  <SelectValue placeholder="None (start empty)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (start empty)</SelectItem>
                  {copyOptions.map((l) => (
                    <SelectItem key={l.key} value={l.key}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optionally copy all criteria from an existing level as a starting point.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Level"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

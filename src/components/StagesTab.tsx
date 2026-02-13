import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Plus, ChevronUp, ChevronDown, Pencil, Trash2, Sparkles } from "lucide-react";
import { StageEditor } from "./StageEditor";

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

interface StagesTabProps {
  roleId: Id<"roles">;
  stages: HiringStage[];
  isAdmin: boolean;
}

export const StagesTab = ({ roleId, stages, isAdmin }: StagesTabProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<HiringStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<HiringStage | null>(null);
  const { toast } = useToast();

  const removeStage = useMutation(api.hiringStages.remove);
  const reorderStage = useMutation(api.hiringStages.reorder);

  const handleDelete = async () => {
    if (!deletingStage) return;
    try {
      await removeStage({ id: deletingStage._id as Id<"hiringStages"> });
      toast({ title: "Success", description: "Stage deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete stage", variant: "destructive" });
    }
    setDeletingStage(null);
  };

  const handleMoveUp = async (stage: HiringStage, index: number) => {
    if (index === 0) return;
    try {
      await reorderStage({ id: stage._id as Id<"hiringStages">, newOrderIndex: index - 1 });
    } catch {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  const handleMoveDown = async (stage: HiringStage, index: number) => {
    if (index === stages.length - 1) return;
    try {
      await reorderStage({ id: stage._id as Id<"hiringStages">, newOrderIndex: index + 1 });
    } catch {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No pipeline stages</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Define the stages candidates will go through in this role's hiring pipeline.
        </p>
        {isAdmin && (
          <Button onClick={() => { setEditingStage(null); setIsEditorOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        )}
        <StageEditor
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          roleId={roleId}
          existingStage={null}
          nextOrderIndex={0}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={stage._id} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
            <Card className="relative overflow-hidden">
              <div className="h-0.5 bg-gradient-knak" />
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Order number */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">{index + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-sm truncate">{stage.title}</h3>
                      <Badge variant="outline" className="text-xs shrink-0 gap-1">
                        <Sparkles className="w-3 h-3" /> AI Interview
                      </Badge>
                    </div>
                    {stage.description && (
                      <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
                    )}
                    {(stage.gateMinScore != null || stage.gateMinRatedPct != null) && (
                      <div className="flex gap-2 mt-1">
                        {stage.gateMinScore != null && (
                          <Badge variant="secondary" className="text-xs">
                            Min score: {stage.gateMinScore}
                          </Badge>
                        )}
                        {stage.gateMinRatedPct != null && (
                          <Badge variant="secondary" className="text-xs">
                            Min rated: {stage.gateMinRatedPct}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(stage, index)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === stages.length - 1}
                        onClick={() => handleMoveDown(stage, index)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditingStage(stage); setIsEditorOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingStage(stage)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Add stage button */}
        {isAdmin && (
          <button
            onClick={() => { setEditingStage(null); setIsEditorOpen(true); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/40 p-4 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02]"
          >
            <Plus className="w-4 h-4" />
            Add Stage
          </button>
        )}
      </div>

      <StageEditor
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingStage(null);
        }}
        roleId={roleId}
        existingStage={editingStage}
        nextOrderIndex={stages.length}
      />

      <AlertDialog open={!!deletingStage} onOpenChange={() => setDeletingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingStage?.title}"? This will not delete existing assessments for this stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

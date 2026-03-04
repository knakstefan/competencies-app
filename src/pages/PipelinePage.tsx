import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GlobalStageEditor } from "@/components/GlobalStageEditor";
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
import { Plus, ChevronUp, ChevronDown, Pencil, Trash2, Loader2, Sparkles, GitBranchPlus } from "lucide-react";

interface GlobalStage {
  _id: Id<"globalStages">;
  title: string;
  description?: string;
  stageType: string;
  aiInstructions?: string;
  gateMinScore?: number;
  gateMinRatedPct?: number;
  orderIndex: number;
}

const PipelinePage = () => {
  const { isAdmin } = useAuth();
  const stages = useQuery(api.globalStages.list) as GlobalStage[] | undefined;
  const reorderStages = useMutation(api.globalStages.reorder);
  const removeStage = useMutation(api.globalStages.remove);
  const { toast } = useToast();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<GlobalStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<GlobalStage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (stages === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0 || !stages) return;
    const updates = stages.map((s, i) => {
      if (i === index) return { id: s._id, orderIndex: i - 1 };
      if (i === index - 1) return { id: s._id, orderIndex: i + 1 };
      return { id: s._id, orderIndex: i };
    });
    try {
      await reorderStages({ updates });
    } catch {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  const handleMoveDown = async (index: number) => {
    if (!stages || index === stages.length - 1) return;
    const updates = stages.map((s, i) => {
      if (i === index) return { id: s._id, orderIndex: i + 1 };
      if (i === index + 1) return { id: s._id, orderIndex: i - 1 };
      return { id: s._id, orderIndex: i };
    });
    try {
      await reorderStages({ updates });
    } catch {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingStage) return;
    setDeleteLoading(true);
    try {
      await removeStage({ id: deletingStage._id });
      toast({ title: "Success", description: "Stage deleted from all roles" });
    } catch (error) {
      toast({
        title: "Cannot delete",
        description: error instanceof Error ? error.message : "Failed to delete stage",
        variant: "destructive",
      });
    }
    setDeleteLoading(false);
    setDeletingStage(null);
  };

  // Empty state
  if (stages.length === 0) {
    return (
      <div className="ambient-glow">
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-4xl font-bold gradient-heading">Hiring Stages</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Define interview stages globally. Changes propagate to all roles.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <GitBranchPlus className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No pipeline stages</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Define the stages candidates will go through in the hiring pipeline.
            </p>
            {isAdmin && (
              <Button onClick={() => { setEditingStage(null); setIsEditorOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            )}
          </div>
        </div>

        <GlobalStageEditor
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          existingStage={null}
          nextOrderIndex={0}
        />
      </div>
    );
  }

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">Hiring Stages</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Define interview stages globally. Changes propagate to all roles.
          </p>
        </div>

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage._id} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
              <Card className="relative overflow-hidden">
                <div className="h-0.5 bg-gradient-knak" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>

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

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === stages.length - 1}
                          onClick={() => handleMoveDown(index)}
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
      </div>

      <GlobalStageEditor
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingStage(null);
        }}
        existingStage={editingStage}
        nextOrderIndex={stages.length}
      />

      <AlertDialog open={!!deletingStage} onOpenChange={() => setDeletingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingStage?.title}"? This will remove it from all roles.
              {"\n\n"}If active candidates are on this stage, deletion will be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PipelinePage;

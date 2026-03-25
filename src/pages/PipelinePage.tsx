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
      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 animate-fade-up">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-heading">Hiring Stages</h1>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-card/60 ring-1 ring-border/50 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <GitBranchPlus className="w-3 h-3 text-primary/70" />
                {stages.length} {stages.length === 1 ? "stage" : "stages"}
              </span>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => { setEditingStage(null); setIsEditorOpen(true); }}
              size="sm"
              className="rounded-full px-4 h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Stage
            </Button>
          )}
        </div>

        {/* Stages list */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-card/40">
            {stages.map((stage, index) => (
              <div
                key={stage._id}
                className={`group flex items-center gap-4 px-4 py-3.5 transition-all duration-200 hover:bg-primary/[0.03] ${
                  index > 0 ? "border-t border-border/30" : ""
                }`}
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{index + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{stage.title}</span>
                    <Badge variant="outline" className="text-[11px] h-5 px-1.5 shrink-0 gap-1">
                      <Sparkles className="w-3 h-3" /> AI
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {stage.description && (
                      <span className="text-xs text-muted-foreground truncate">{stage.description}</span>
                    )}
                  </div>
                  {(stage.gateMinScore != null || stage.gateMinRatedPct != null) && (
                    <div className="flex gap-1.5 mt-1">
                      {stage.gateMinScore != null && (
                        <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                          Min: {stage.gateMinScore}
                        </Badge>
                      )}
                      {stage.gateMinRatedPct != null && (
                        <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                          Rated: {stage.gateMinRatedPct}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === stages.length - 1} onClick={() => handleMoveDown(index)}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingStage(stage); setIsEditorOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeletingStage(stage)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
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

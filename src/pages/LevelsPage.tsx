import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LevelEditor } from "@/components/LevelEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, ChevronUp, ChevronDown, Pencil, Trash2, Loader2, Layers } from "lucide-react";

interface GlobalLevel {
  _id: Id<"globalLevels">;
  type: "ic" | "management";
  key: string;
  label: string;
  description?: string;
  orderIndex: number;
}

const LevelsPage = () => {
  const { isAdmin } = useAuth();
  const allLevels = useQuery(api.globalLevels.list) as GlobalLevel[] | undefined;
  const reorderLevels = useMutation(api.globalLevels.reorder);
  const removeLevel = useMutation(api.globalLevels.remove);
  const { toast } = useToast();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<GlobalLevel | null>(null);
  const [editorType, setEditorType] = useState<"ic" | "management">("ic");
  const [deletingLevel, setDeletingLevel] = useState<GlobalLevel | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (allLevels === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const icLevels = allLevels.filter((l) => l.type === "ic").sort((a, b) => a.orderIndex - b.orderIndex);
  const mgmtLevels = allLevels.filter((l) => l.type === "management").sort((a, b) => a.orderIndex - b.orderIndex);

  const handleMoveUp = async (levels: GlobalLevel[], index: number) => {
    if (index === 0) return;
    const updates = levels.map((l, i) => {
      if (i === index) return { id: l._id, orderIndex: i - 1 };
      if (i === index - 1) return { id: l._id, orderIndex: i + 1 };
      return { id: l._id, orderIndex: i };
    });
    try {
      await reorderLevels({ updates });
    } catch {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  const handleMoveDown = async (levels: GlobalLevel[], index: number) => {
    if (index === levels.length - 1) return;
    const updates = levels.map((l, i) => {
      if (i === index) return { id: l._id, orderIndex: i + 1 };
      if (i === index + 1) return { id: l._id, orderIndex: i - 1 };
      return { id: l._id, orderIndex: i };
    });
    try {
      await reorderLevels({ updates });
    } catch {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingLevel) return;
    setDeleteLoading(true);
    try {
      await removeLevel({ id: deletingLevel._id });
      toast({ title: "Success", description: "Level deleted" });
    } catch (error) {
      toast({
        title: "Cannot delete",
        description: error instanceof Error ? error.message : "Failed to delete level",
        variant: "destructive",
      });
    }
    setDeleteLoading(false);
    setDeletingLevel(null);
  };

  const openCreate = (type: "ic" | "management") => {
    setEditingLevel(null);
    setEditorType(type);
    setIsEditorOpen(true);
  };

  const openEdit = (level: GlobalLevel) => {
    setEditingLevel(level);
    setEditorType(level.type);
    setIsEditorOpen(true);
  };

  const renderLevelList = (levels: GlobalLevel[], type: "ic" | "management") => {
    if (levels.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            No {type === "ic" ? "IC" : "Management"} levels
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Define the career levels for {type === "ic" ? "individual contributors" : "management roles"}.
          </p>
          {isAdmin && (
            <Button onClick={() => openCreate(type)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Level
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {levels.map((level, index) => (
          <div key={level._id} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
            <Card className="relative overflow-hidden">
              <div className="h-0.5 bg-gradient-knak" />
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-sm truncate">{level.label}</h3>
                      <Badge variant="outline" className="text-xs shrink-0 font-mono">
                        {level.key}
                      </Badge>
                    </div>
                    {level.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{level.description}</p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(levels, index)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === levels.length - 1}
                        onClick={() => handleMoveDown(levels, index)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(level)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingLevel(level)}
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
            onClick={() => openCreate(type)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/40 p-4 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02]"
          >
            <Plus className="w-4 h-4" />
            Add Level
          </button>
        )}
      </div>
    );
  };

  const nextOrderIndex = editorType === "ic" ? icLevels.length : mgmtLevels.length;

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">Job Levels</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Define career levels globally. Changes propagate to all roles.
          </p>
        </div>

        <Tabs defaultValue="ic">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="ic">IC Levels</TabsTrigger>
              <TabsTrigger value="management">Management Levels</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ic">{renderLevelList(icLevels, "ic")}</TabsContent>
          <TabsContent value="management">{renderLevelList(mgmtLevels, "management")}</TabsContent>
        </Tabs>
      </div>

      <LevelEditor
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingLevel(null);
        }}
        existingLevel={editingLevel}
        levelType={editorType}
        nextOrderIndex={nextOrderIndex}
        allLevels={allLevels}
      />

      <AlertDialog open={!!deletingLevel} onOpenChange={() => setDeletingLevel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Level</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLevel?.label}"? This will remove it from all roles and clean up related criteria.
              {"\n\n"}If team members are assigned to this level, deletion will be blocked.
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

export default LevelsPage;

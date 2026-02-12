import { useState } from "react";
import { CompetencyEditor } from "@/components/CompetencyEditor";
import { GenerateDescriptionsButton } from "@/components/GenerateDescriptionsButton";
import { CompetencyExportDialog } from "@/components/CompetencyExportDialog";
import { CompetencyImportDialog } from "@/components/CompetencyImportDialog";
import { Competency, SubCompetency } from "@/types/competency";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, GripVertical, Download, Upload } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ManageTabSkeleton } from "./skeletons/ManageTabSkeleton";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const competencySchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
});

interface SortableCompetencyProps {
  comp: Competency;
  subs: SubCompetency[];
  onUpdate: () => void;
  onEdit: (comp: Competency) => void;
  onDelete: (comp: Competency) => void;
  isCollapsed: boolean;
  orderNumber: number;
}

const SortableCompetency = ({
  comp,
  subs,
  onUpdate,
  onEdit,
  onDelete,
  isCollapsed,
  orderNumber,
}: SortableCompetencyProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: comp._id,
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-200 ${isDragging ? "opacity-40 scale-95 z-50" : "opacity-100"}`}
    >
      {/* Drag handle positioned to align with spacer in CompetencyEditor */}
      <div
        className="absolute top-[24px] left-4 z-10 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
      </div>

      {/* Edit/Delete buttons positioned to align with spacer in CompetencyEditor */}
      <div className="absolute top-[24px] right-4 z-10 flex gap-2">
        <Button onClick={() => onEdit(comp)} variant="outline" size="sm">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button onClick={() => onDelete(comp)} variant="outline" size="sm">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      <CompetencyEditor
        competencyId={comp._id}
        competencyTitle={comp.title}
        competencyDescription={comp.description}
        competencyNumber={orderNumber}
        subCompetencies={subs}
        onUpdate={onUpdate}
        isCollapsed={isCollapsed}
      />
    </div>
  );
};

interface ManageTabProps {
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  onUpdate: () => void;
  loading?: boolean;
}

export const ManageTab = ({ competencies, subCompetencies, onUpdate, loading = false }: ManageTabProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  const updateOrderMutation = useMutation(api.competencies.updateOrder);
  const createMutation = useMutation(api.competencies.create);
  const updateMutation = useMutation(api.competencies.update);
  const removeMutation = useMutation(api.competencies.remove);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const openAddDialog = () => {
    setEditingCompetency(null);
    setFormData({ title: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (comp: Competency) => {
    setEditingCompetency(comp);
    setFormData({ title: comp.title, description: comp.description || "" });
    setDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Collapse all competencies when dragging starts
    const allCollapsed: Record<string, boolean> = {};
    competencies.forEach((comp) => {
      allCollapsed[comp._id] = true;
    });
    setCollapsedStates(allCollapsed);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);

    // Clear collapsed states after drag ends to restore normal functionality
    setCollapsedStates({});

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = competencies.findIndex((c) => c._id === active.id);
      const newIndex = competencies.findIndex((c) => c._id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(competencies, oldIndex, newIndex);

        // Update orderIndex for all affected competencies
        try {
          await updateOrderMutation({
            updates: reordered.map((comp, idx) => ({
              id: comp._id,
              orderIndex: idx + 1,
            })),
          });

          toast({
            title: "Success",
            description: "Competencies reordered successfully",
          });

          onUpdate();
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to reorder competencies",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleSave = async () => {
    try {
      const validated = competencySchema.parse(formData);

      if (editingCompetency) {
        // Update existing competency
        await updateMutation({
          id: editingCompetency._id,
          title: validated.title,
          description: validated.description || undefined,
        });

        toast({
          title: "Success",
          description: "Competency updated successfully",
        });
      } else {
        // Add new competency
        const maxOrderIndex = competencies.length > 0 ? Math.max(...competencies.map((c) => c.orderIndex)) : 0;

        await createMutation({
          title: validated.title,
          description: validated.description || undefined,
          orderIndex: maxOrderIndex + 1,
        });

        toast({
          title: "Success",
          description: "Competency added successfully",
        });
      }

      setDialogOpen(false);
      setFormData({ title: "", description: "" });
      onUpdate();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error",
        description: `Failed to ${editingCompetency ? "update" : "add"} competency`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (comp: Competency) => {
    if (
      !confirm(
        `Are you sure you want to delete "${comp.title}"? This will also delete all associated sub-competencies.`,
      )
    ) {
      return;
    }

    try {
      await removeMutation({ id: comp._id });

      toast({
        title: "Success",
        description: "Competency deleted successfully",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete competency",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <ManageTabSkeleton />
      ) : (
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-foreground mb-2">Product Designer Competencies</h2>
              <p className="text-muted-foreground text-sm">
                A complete set of competencies for the Product Designer role at Knak.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4" />
                Add Competency
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={competencies.map((c) => c._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {competencies.map((comp, index) => {
                  const subs = subCompetencies.filter((sub) => sub.competencyId === comp._id);
                  return (
                    <SortableCompetency
                      key={comp._id}
                      comp={comp}
                      subs={subs}
                      onUpdate={onUpdate}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      isCollapsed={collapsedStates[comp._id] || false}
                      orderNumber={index + 1}
                    />
                  );
                })}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="opacity-90 shadow-2xl rotate-2">
                  {(() => {
                    const comp = competencies.find((c) => c._id === activeId);
                    if (!comp) return null;
                    const subs = subCompetencies.filter((sub) => sub.competencyId === comp._id);
                    const orderIndex = competencies.findIndex((c) => c._id === activeId);
                    return (
                      <div className="relative pointer-events-none">
                        {/* Drag handle for overlay */}
                        <div className="absolute top-[18px] left-4 z-10">
                          <GripVertical className="w-5 h-5 text-foreground" />
                        </div>
                        <CompetencyEditor
                          competencyId={comp._id}
                          competencyTitle={comp.title}
                          competencyNumber={orderIndex + 1}
                          subCompetencies={subs}
                          onUpdate={onUpdate}
                          isCollapsed={true}
                        />
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompetency ? "Edit Competency" : "Add New Competency"}</DialogTitle>
            <DialogDescription>
              {editingCompetency ? "Update the competency details below." : "Enter the details for the new competency."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Visual Design"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide a brief description of this competency..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">{formData.description.length}/1000 characters</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingCompetency ? "Update" : "Add"} Competency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CompetencyExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        competencies={competencies}
        subCompetencies={subCompetencies}
      />

      <CompetencyImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={onUpdate}
      />
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, ChevronDown, ChevronRight, Plus, GripVertical } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { SubCompetencyEditor } from "./SubCompetencyEditor";
import { z } from "zod";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { RoleLevel, FALLBACK_LEVELS, getCriteriaForLevelWithFallback, getLevelOptions } from "@/lib/levelUtils";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title cannot be empty")
  .max(200, "Title must be less than 200 characters");

interface SubCompetency {
  _id: string;
  title: string;
  code?: string;
  orderIndex?: number;
  competencyId: string;
  levelCriteria?: Record<string, string[]> | null;
}

interface SortableSubCompetencyProps {
  sub: SubCompetency;
  editingSubId: string | null;
  onStartEdit: (sub: SubCompetency) => void;
  onCancelEdit: () => void;
  onSave: (subId: string, title: string, levelCriteria: Record<string, string[]>) => void;
  onDelete: (id: string) => void;
  isCollapsed: boolean;
  levels: RoleLevel[];
}

const SortableSubCompetency = ({
  sub,
  editingSubId,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isCollapsed,
  levels,
}: SortableSubCompetencyProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sub._id,
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const subForEditor = {
    _id: sub._id,
    title: sub.title,
    code: sub.code,
    levelCriteria: sub.levelCriteria,
  };

  // Dynamic level options derived from role levels
  const levelOptions = getLevelOptions(levels);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-200 ${isDragging ? "opacity-40 scale-95" : "opacity-100"}`}
    >
      {/* Drag handle */}
      <div className="absolute top-4 left-2 z-10 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
      </div>

      <div className="rounded-xl p-5 pl-10 bg-muted/30 space-y-4 transition-all hover:bg-muted/40">
        {editingSubId === sub._id ? (
          <SubCompetencyEditor
            subCompetency={subForEditor}
            onSave={(title, levelCriteria) => onSave(sub._id, title, levelCriteria)}
            onCancel={onCancelEdit}
            levels={levels}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">{sub.code}</span>
                <h4 className="font-medium">{sub.title}</h4>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onStartEdit(sub)} variant="ghost" size="sm">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button onClick={() => onDelete(sub._id)} variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="space-y-3">
                {levelOptions.map((level) => {
                  const criteria = getCriteriaForLevelWithFallback(sub, level.key);

                  return (
                    <div key={level.key} className="rounded-lg p-3 bg-muted/40">
                      <Label className="text-xs font-semibold text-muted-foreground mb-1 block">{level.label}</Label>
                      {criteria.length > 0 ? (
                        <ul className="space-y-1 text-sm list-disc list-inside">
                          {criteria.map((criterion, idx) => (
                            <li key={idx}>{criterion}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No criteria</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface CompetencyEditorProps {
  competencyId: string;
  competencyTitle: string;
  competencyDescription?: string | null;
  competencyNumber: number;
  subCompetencies: SubCompetency[];
  onUpdate: () => void;
  isCollapsed?: boolean;
  levels?: RoleLevel[];
}

export const CompetencyEditor = ({
  competencyId,
  competencyTitle,
  competencyDescription,
  competencyNumber,
  subCompetencies,
  onUpdate,
  isCollapsed = false,
  levels = FALLBACK_LEVELS,
}: CompetencyEditorProps) => {
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isOpen, setIsOpen] = useState(!isCollapsed);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [collapsedSubStates, setCollapsedSubStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const updateSubMutation = useMutation(api.competencies.updateSub);
  const createSubMutation = useMutation(api.competencies.createSub);
  const removeSubMutation = useMutation(api.competencies.removeSub);
  const updateSubOrderMutation = useMutation(api.competencies.updateSubOrder);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Update internal state when isCollapsed prop changes (e.g., during drag)
  // But only force close, don't force open - allow user to control opening
  useEffect(() => {
    if (isCollapsed && isOpen) {
      setIsOpen(false);
    }
  }, [isCollapsed, isOpen]);


  const startEditingTitle = (sub: SubCompetency) => {
    setEditingSubId(sub._id);
  };

  const cancelEditingTitle = () => {
    setEditingSubId(null);
  };

  const startAddingNew = () => {
    setIsAddingNew(true);
  };

  const cancelAddingNew = () => {
    setIsAddingNew(false);
  };

  const saveAllLevels = async (
    subId: string,
    title: string,
    levelCriteria: Record<string, string[]>,
  ) => {
    try {
      await updateSubMutation({
        id: subId as any,
        title,
        levelCriteria,
      });

      toast({
        title: "Success",
        description: "Sub-competency updated successfully",
      });

      setEditingSubId(null);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sub-competency",
        variant: "destructive",
      });
    }
  };

  const addNewSubCompetency = async (
    title: string,
    levelCriteria: Record<string, string[]>,
  ) => {
    try {
      const maxOrderIndex =
        subCompetencies.length > 0 ? Math.max(...subCompetencies.map((s) => s.orderIndex || 0)) : 0;

      await createSubMutation({
        competencyId: competencyId as any,
        title: title,
        orderIndex: maxOrderIndex + 1,
        levelCriteria,
      });

      toast({
        title: "Success",
        description: "Sub-competency added successfully",
      });

      setIsAddingNew(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add sub-competency",
        variant: "destructive",
      });
    }
  };

  const deleteSubCompetency = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sub-competency?")) return;

    try {
      await removeSubMutation({ id: id as any });

      toast({
        title: "Success",
        description: "Sub-competency deleted successfully",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete sub-competency",
        variant: "destructive",
      });
    }
  };

  const handleSubDragStart = (event: DragStartEvent) => {
    setActiveSubId(event.active.id as string);
    // Collapse all sub-competencies when dragging starts
    const allCollapsed: Record<string, boolean> = {};
    subCompetencies.forEach((sub) => {
      allCollapsed[sub._id] = true;
    });
    setCollapsedSubStates(allCollapsed);
  };

  const handleSubDragEnd = async (event: DragEndEvent) => {
    setActiveSubId(null);
    setCollapsedSubStates({});

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = subCompetencies.findIndex((s) => s._id === active.id);
      const newIndex = subCompetencies.findIndex((s) => s._id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(subCompetencies, oldIndex, newIndex);

        try {
          await updateSubOrderMutation({
            updates: reordered.map((sub, index) => ({
              id: sub._id as any,
              orderIndex: index + 1,
            })),
          });

          toast({
            title: "Success",
            description: "Sub-competencies reordered successfully",
          });

          onUpdate();
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to reorder sub-competencies",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center gap-4">
            {/* Spacer for drag handle - 44px to match the drag handle width */}
            <div className="w-4 flex-shrink-0" />

            {/* Clickable title area */}
            <CollapsibleTrigger asChild>
              <button
                className="flex items-start gap-3 flex-1 text-left hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isCollapsed}
              >
                <span className="text-lg font-semibold text-primary min-w-[1rem]">{competencyNumber}.</span>
                <div className="flex-1">
                  <CardTitle>{competencyTitle}</CardTitle>
                  {competencyDescription && (
                    <p className="text-sm text-muted-foreground mt-1">{competencyDescription}</p>
                  )}
                </div>
                <div className="flex-shrink-0 hidden">
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </button>
            </CollapsibleTrigger>

            {/* Spacer for edit/delete buttons - matches their width */}
            <div className="w-24 flex-shrink-0" />
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleSubDragStart}
              onDragEnd={handleSubDragEnd}
            >
              <SortableContext items={subCompetencies.map((s) => s._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-6">
                  {subCompetencies.map((sub, index) => (
                    <SortableSubCompetency
                      key={sub._id}
                      sub={{ ...sub, code: `${competencyNumber}.${index + 1}` }}
                      editingSubId={editingSubId}
                      onStartEdit={startEditingTitle}
                      onCancelEdit={cancelEditingTitle}
                      onSave={saveAllLevels}
                      onDelete={deleteSubCompetency}
                      isCollapsed={collapsedSubStates[sub._id] || false}
                      levels={levels}
                    />
                  ))}

                  {isAddingNew && (
                    <div className="rounded-xl p-5 bg-muted/30 space-y-4">
                      <SubCompetencyEditor
                        subCompetency={{
                          _id: "new",
                          title: "",
                          code: `${competencyNumber}.${subCompetencies.length + 1}`,
                        }}
                        onSave={(title, levelCriteria) => addNewSubCompetency(title, levelCriteria)}
                        onCancel={cancelAddingNew}
                        isNew
                        levels={levels}
                      />
                    </div>
                  )}

                  {!isAddingNew && (
                    <Button onClick={startAddingNew} variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Sub-Competency
                    </Button>
                  )}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeSubId ? (
                  <div className="opacity-90 shadow-2xl rotate-1">
                    {(() => {
                      const sub = subCompetencies.find((s) => s._id === activeSubId);
                      if (!sub) return null;
                      return (
                        <div className="relative pointer-events-none">
                          <div className="absolute top-4 left-2 z-10">
                            <GripVertical className="w-4 h-4 text-foreground" />
                          </div>
                          <div className="rounded-xl p-5 pl-10 bg-muted/30 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-muted-foreground">
                                  {`${competencyNumber}.${subCompetencies.findIndex((s) => s._id === sub._id) + 1}`}
                                </span>
                                <h4 className="font-medium">{sub.title}</h4>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

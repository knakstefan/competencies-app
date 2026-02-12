import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X, Plus, Trash2, GripVertical, Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const criterionSchema = z.string()
  .trim()
  .min(1, "Criterion cannot be empty")
  .max(500, "Criterion must be less than 500 characters");
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  id: string;
  criterion: string;
  onRemove: () => void;
  onUpdate: (newText: string) => void;
}

const SortableItem = ({ id, criterion, onRemove, onUpdate }: SortableItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(criterion);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    try {
      const validatedText = criterionSchema.parse(editText);
      onUpdate(validatedText);
      setIsEditing(false);
    } catch (error) {
      // Validation error - keep editing mode open
      if (error instanceof z.ZodError) {
        // The parent component will show the error
      }
    }
  };

  const handleCancel = () => {
    setEditText(criterion);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-card/50 rounded-lg shadow-sm transition-all hover:shadow-md"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {isEditing ? (
        <>
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              } else if (e.key === "Escape") {
                handleCancel();
              }
            }}
            className="flex-1"
            autoFocus
          />
          <Button
            onClick={handleSave}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Check className="w-4 h-4 text-primary" />
          </Button>
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <p className="flex-1 text-sm">{criterion}</p>
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </>
      )}
    </div>
  );
};

interface LevelCriteriaEditorProps {
  levelName: string;
  criteria: string[];
  onSave: (criteria: string[]) => void;
}

export const LevelCriteriaEditor = ({
  levelName,
  criteria,
  onSave,
}: LevelCriteriaEditorProps) => {
  const [editedCriteria, setEditedCriteria] = useState<string[]>(criteria);
  const [newCriterion, setNewCriterion] = useState("");
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditedCriteria((items) => {
        const oldIndex = parseInt((active.id as string).split('-').pop() || '0');
        const newIndex = parseInt((over.id as string).split('-').pop() || '0');
        const reordered = arrayMove(items, oldIndex, newIndex);
        onSave(reordered);
        return reordered;
      });
    }
  };

  const addCriterion = () => {
    try {
      const validatedCriterion = criterionSchema.parse(newCriterion);
      const updated = [...editedCriteria, validatedCriterion];
      setEditedCriteria(updated);
      onSave(updated);
      setNewCriterion("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const removeCriterion = (index: number) => {
    const updated = editedCriteria.filter((_, i) => i !== index);
    setEditedCriteria(updated);
    onSave(updated);
  };

  const updateCriterion = (index: number, newText: string) => {
    try {
      const validatedText = criterionSchema.parse(newText);
      const updated = editedCriteria.map((criterion, i) => 
        i === index ? validatedText : criterion
      );
      setEditedCriteria(updated);
      onSave(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-4 p-5 rounded-xl bg-muted/40">
      <Label className="text-base font-semibold">{levelName}</Label>

      <div className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={editedCriteria.map((_, index) => `criterion-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            {editedCriteria.map((criterion, index) => (
              <SortableItem
                key={`criterion-${index}`}
                id={`criterion-${index}`}
                criterion={criterion}
                onRemove={() => removeCriterion(index)}
                onUpdate={(newText) => updateCriterion(index, newText)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add new criterion..."
          value={newCriterion}
          onChange={(e) => setNewCriterion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCriterion();
            }
          }}
        />
        <Button onClick={addCriterion} size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

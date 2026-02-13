import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X } from "lucide-react";
import { LevelCriteriaEditor } from "./LevelCriteriaEditor";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { RoleLevel, FALLBACK_LEVELS, getCriteriaForLevelWithFallback } from "@/lib/levelUtils";

const titleSchema = z.string()
  .trim()
  .min(1, "Title cannot be empty")
  .max(200, "Title must be less than 200 characters");

interface SubCompetency {
  _id: string;
  title: string;
  code?: string;
  levelCriteria?: Record<string, string[]> | null;
}

interface SubCompetencyEditorProps {
  subCompetency: SubCompetency;
  onSave: (title: string, levelCriteria: Record<string, string[]>) => void;
  onCancel: () => void;
  isNew?: boolean;
  levels?: RoleLevel[];
}

export const SubCompetencyEditor = ({
  subCompetency,
  onSave,
  onCancel,
  isNew = false,
  levels = FALLBACK_LEVELS,
}: SubCompetencyEditorProps) => {
  const [title, setTitle] = useState(subCompetency.title);

  // Initialize state from levelCriteria or fall back to legacy columns
  const [criteria, setCriteria] = useState<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    for (const level of levels) {
      result[level.key] = getCriteriaForLevelWithFallback(subCompetency, level.key);
    }
    return result;
  });

  const { toast } = useToast();

  const handleLevelUpdate = (levelKey: string, newCriteria: string[]) => {
    setCriteria({ ...criteria, [levelKey]: newCriteria });
  };

  const handleSave = () => {
    try {
      const validatedTitle = titleSchema.parse(title);
      onSave(validatedTitle, criteria);
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">
          {subCompetency.code}
        </span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
          placeholder="Sub-competency title"
        />
      </div>

      <Tabs defaultValue={levels[0]?.key} className="w-full">
        <TabsList style={{ gridTemplateColumns: `repeat(${levels.length}, 1fr)` }} className="grid w-full">
          {levels.map((level) => (
            <TabsTrigger key={level.key} value={level.key}>
              {level.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {levels.map((level) => (
          <TabsContent key={level.key} value={level.key} className="space-y-4">
            <LevelCriteriaEditor
              levelName={`${level.label} Level`}
              criteria={criteria[level.key] || []}
              onSave={(newCriteria) => handleLevelUpdate(level.key, newCriteria)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button onClick={onCancel} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
};

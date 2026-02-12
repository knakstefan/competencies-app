import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X } from "lucide-react";
import { LevelCriteriaEditor } from "./LevelCriteriaEditor";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const titleSchema = z.string()
  .trim()
  .min(1, "Title cannot be empty")
  .max(200, "Title must be less than 200 characters");

interface SubCompetency {
  _id: string;
  title: string;
  code?: string;
  associateLevel: string[] | null;
  intermediateLevel: string[] | null;
  seniorLevel: string[] | null;
  leadLevel: string[] | null;
  principalLevel: string[] | null;
}

interface SubCompetencyEditorProps {
  subCompetency: SubCompetency;
  onSave: (title: string, levels: {
    associateLevel: string[];
    intermediateLevel: string[];
    seniorLevel: string[];
    leadLevel: string[];
    principalLevel: string[];
  }) => void;
  onCancel: () => void;
  isNew?: boolean;
}

export const SubCompetencyEditor = ({
  subCompetency,
  onSave,
  onCancel,
  isNew = false,
}: SubCompetencyEditorProps) => {
  const [title, setTitle] = useState(subCompetency.title);
  const [levels, setLevels] = useState({
    associateLevel: subCompetency.associateLevel || [],
    intermediateLevel: subCompetency.intermediateLevel || [],
    seniorLevel: subCompetency.seniorLevel || [],
    leadLevel: subCompetency.leadLevel || [],
    principalLevel: subCompetency.principalLevel || [],
  });
  const { toast } = useToast();

  const handleLevelUpdate = (levelKey: string, criteria: string[]) => {
    setLevels({ ...levels, [levelKey]: criteria });
  };

  const handleSave = () => {
    try {
      const validatedTitle = titleSchema.parse(title);
      onSave(validatedTitle, levels);
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

      <Tabs defaultValue="associate" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="associate">Associate</TabsTrigger>
          <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
          <TabsTrigger value="senior">Senior</TabsTrigger>
          <TabsTrigger value="lead">Lead</TabsTrigger>
          <TabsTrigger value="principal">Principal</TabsTrigger>
        </TabsList>

        <TabsContent value="associate" className="space-y-4">
          <LevelCriteriaEditor
            levelName="Associate Level"
            criteria={levels.associateLevel}
            onSave={(criteria) => handleLevelUpdate("associateLevel", criteria)}
          />
        </TabsContent>

        <TabsContent value="intermediate" className="space-y-4">
          <LevelCriteriaEditor
            levelName="Intermediate Level"
            criteria={levels.intermediateLevel}
            onSave={(criteria) => handleLevelUpdate("intermediateLevel", criteria)}
          />
        </TabsContent>

        <TabsContent value="senior" className="space-y-4">
          <LevelCriteriaEditor
            levelName="Senior Level"
            criteria={levels.seniorLevel}
            onSave={(criteria) => handleLevelUpdate("seniorLevel", criteria)}
          />
        </TabsContent>

        <TabsContent value="lead" className="space-y-4">
          <LevelCriteriaEditor
            levelName="Lead Level"
            criteria={levels.leadLevel}
            onSave={(criteria) => handleLevelUpdate("leadLevel", criteria)}
          />
        </TabsContent>

        <TabsContent value="principal" className="space-y-4">
          <LevelCriteriaEditor
            levelName="Principal Level"
            criteria={levels.principalLevel}
            onSave={(criteria) => handleLevelUpdate("principalLevel", criteria)}
          />
        </TabsContent>
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

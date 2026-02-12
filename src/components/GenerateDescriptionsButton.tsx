import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

interface GenerateDescriptionsButtonProps {
  competencies: any[];
  subCompetencies: any[];
  onUpdate?: () => void;
}

export const GenerateDescriptionsButton = ({
  competencies,
  subCompetencies,
}: GenerateDescriptionsButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const generateDescriptions = useAction(api.ai.generateCompetencyDescriptions);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const competenciesWithSubs = competencies.map((comp) => ({
        id: comp._id,
        title: comp.title,
        subCompetencies: subCompetencies
          .filter((sub) => sub.competencyId === comp._id)
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
          .map((sub) => ({
            title: sub.title,
          })),
      }));

      await generateDescriptions({ competencies: competenciesWithSubs });

      toast({
        title: "Success",
        description: "Competency descriptions generated successfully",
      });
    } catch (error) {
      console.error("Error generating descriptions:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate descriptions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
      <Sparkles className="w-4 h-4 mr-2" />
      {isGenerating ? "Generating..." : "Generate Descriptions"}
    </Button>
  );
};

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Level = "associate" | "intermediate" | "senior" | "lead" | "principal";

interface LevelFilterProps {
  currentLevel: Level;
  onLevelChange: (level: Level) => void;
}

export const LevelFilter = ({ currentLevel, onLevelChange }: LevelFilterProps) => {
  const levels: { value: Level; label: string }[] = [
    { value: "associate", label: "Associate" },
    { value: "intermediate", label: "Intermediate" },
    { value: "senior", label: "Senior" },
    { value: "lead", label: "Lead Designer" },
    { value: "principal", label: "Principal" },
  ];

  return (
    <Tabs value={currentLevel} onValueChange={(value) => onLevelChange(value as Level)}>
      <TabsList className="grid w-full grid-cols-5 h-auto">
        {levels.map((level) => (
          <TabsTrigger
            key={level.value}
            value={level.value}
            className="text-xs sm:text-sm py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {level.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

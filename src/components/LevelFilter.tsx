import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleLevel, FALLBACK_LEVELS, getLevelOptions } from "@/lib/levelUtils";

interface LevelFilterProps {
  currentLevel: string;
  onLevelChange: (level: string) => void;
  levels?: RoleLevel[];
}

export const LevelFilter = ({ currentLevel, onLevelChange, levels = FALLBACK_LEVELS }: LevelFilterProps) => {
  const levelOptions = getLevelOptions(levels);

  return (
    <Tabs value={currentLevel} onValueChange={(value) => onLevelChange(value)}>
      <TabsList style={{ gridTemplateColumns: `repeat(${levelOptions.length}, 1fr)` }} className="grid w-full h-auto">
        {levelOptions.map((level) => (
          <TabsTrigger
            key={level.key}
            value={level.key}
            className="text-xs sm:text-sm py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {level.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

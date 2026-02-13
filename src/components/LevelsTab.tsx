import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { ViewTab } from "./ViewTab";
import { RoleLevel } from "@/lib/levelUtils";
import { Competency, SubCompetency } from "@/types/competency";

interface LevelsTabProps {
  roleType: "ic" | "management";
  levels: RoleLevel[];
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  loading: boolean;
}

export const LevelsTab = ({ levels, competencies, subCompetencies, loading }: LevelsTabProps) => {
  const [showCriteriaViewer, setShowCriteriaViewer] = useState(false);

  return (
    <>
      <div className="space-y-3">
        {levels.map((level, index) => (
          <div key={level.key} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
            <Card className="relative overflow-hidden">
              <div className="h-0.5 bg-gradient-knak" />
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Order number */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">{index + 1}</span>
                  </div>

                  {/* Content */}
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
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Collapsible criteria viewer */}
      {competencies.length > 0 && (
        <Collapsible open={showCriteriaViewer} onOpenChange={setShowCriteriaViewer} className="mt-8">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className={`h-4 w-4 transition-transform ${showCriteriaViewer ? "rotate-90" : ""}`} />
              Criteria by Level
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <ViewTab
              competencies={competencies}
              subCompetencies={subCompetencies}
              loading={loading}
              levels={levels}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
};

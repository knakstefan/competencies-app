import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { Competency, SubCompetency } from "@/types/competency";
import { RoleLevel, FALLBACK_LEVELS, getCriteriaForLevelWithFallback, getLevelOptions } from "@/lib/levelUtils";

interface Gap {
  competencyTitle: string;
  subCompetencyTitle: string;
  emptyLevels: string[];
}

interface UnevenCriteria {
  competencyTitle: string;
  subCompetencyTitle: string;
  counts: Record<string, number>;
  min: number;
  max: number;
}

interface FrameworkHealthProps {
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  levels?: RoleLevel[];
}

export const FrameworkHealth = ({ competencies, subCompetencies, levels = FALLBACK_LEVELS }: FrameworkHealthProps) => {
  const [open, setOpen] = useState(false);

  const levelOptions = getLevelOptions(levels);

  const totalCompetencies = competencies.length;
  const totalSubCompetencies = subCompetencies.length;
  const totalLevelSlots = totalSubCompetencies * levelOptions.length;

  let filledSlots = 0;
  const gaps: Gap[] = [];
  const unevenItems: UnevenCriteria[] = [];

  subCompetencies.forEach((sub) => {
    const comp = competencies.find((c) => c._id === sub.competencyId);
    const competencyTitle = comp?.title ?? "Unknown";
    const emptyLevels: string[] = [];
    const counts: Record<string, number> = {};

    levelOptions.forEach(({ key, label }) => {
      const criteria = getCriteriaForLevelWithFallback(sub, key);
      const count = criteria.length;
      counts[label] = count;
      if (count > 0) {
        filledSlots++;
      } else {
        emptyLevels.push(label);
      }
    });

    if (emptyLevels.length > 0) {
      gaps.push({ competencyTitle, subCompetencyTitle: sub.title, emptyLevels });
    }

    const countValues = Object.values(counts).filter((c) => c > 0);
    if (countValues.length >= 2) {
      const min = Math.min(...countValues);
      const max = Math.max(...countValues);
      if (max >= min * 3 && max - min >= 4) {
        unevenItems.push({ competencyTitle, subCompetencyTitle: sub.title, counts, min, max });
      }
    }
  });

  const completionPct = totalLevelSlots > 0 ? Math.round((filledSlots / totalLevelSlots) * 100) : 0;

  const healthStatus = gaps.length === 0 ? "complete" : gaps.length <= 3 ? "partial" : "incomplete";
  const statusColor = {
    complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    incomplete: "bg-red-500/10 text-red-400 border-red-500/20",
  }[healthStatus];
  const statusLabel = {
    complete: "Complete",
    partial: "Partial Gaps",
    incomplete: "Needs Attention",
  }[healthStatus];

  return (
    <Card className="mb-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Framework Health
              <Badge variant="outline" className={statusColor}>
                {statusLabel}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {totalCompetencies} competencies, {totalSubCompetencies} sub-competencies — {completionPct}% complete
              </span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {gaps.length === 0 && unevenItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All sub-competencies have criteria defined at every level. No issues detected.
              </p>
            ) : (
              <>
                {gaps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Empty Levels ({gaps.length} sub-competencies)</h4>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {gaps.map((gap, i) => (
                        <div key={i} className="flex items-start justify-between text-sm py-1.5 px-3 rounded-md bg-muted/50">
                          <div>
                            <span className="text-muted-foreground">{gap.competencyTitle}</span>
                            <span className="text-muted-foreground mx-1.5">/</span>
                            <span>{gap.subCompetencyTitle}</span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-3">
                            {gap.emptyLevels.map((level) => (
                              <Badge key={level} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                                {level}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {unevenItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Uneven Criteria Distribution ({unevenItems.length})</h4>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {unevenItems.map((item, i) => (
                        <div key={i} className="flex items-start justify-between text-sm py-1.5 px-3 rounded-md bg-muted/50">
                          <div>
                            <span className="text-muted-foreground">{item.competencyTitle}</span>
                            <span className="text-muted-foreground mx-1.5">/</span>
                            <span>{item.subCompetencyTitle}</span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-3">
                            {levelOptions.map(({ label }) => (
                              <Badge
                                key={label}
                                variant="outline"
                                className={`text-xs ${
                                  item.counts[label] === item.min
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {label[0]}: {item.counts[label]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

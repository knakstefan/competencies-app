import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HiringCandidate } from "./HiringManagement";

interface HiringPipelineProps {
  candidates: HiringCandidate[];
}

const STAGES = [
  { key: "manager_interview", label: "Manager Interview", color: "bg-blue-500" },
  { key: "portfolio_review", label: "Portfolio Review", color: "bg-purple-500" },
  { key: "team_interview", label: "Team Interview", color: "bg-amber-500" },
  { key: "hired", label: "Hired", color: "bg-green-500" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" },
];

export const HiringPipeline = ({ candidates }: HiringPipelineProps) => {
  const getStageCounts = () => {
    const counts: Record<string, number> = {};
    STAGES.forEach((stage) => {
      counts[stage.key] = candidates.filter((c) => c.currentStage === stage.key).length;
    });
    return counts;
  };

  const stageCounts = getStageCounts();
  const activeStages = STAGES.filter((s) => s.key !== "hired" && s.key !== "rejected");
  const totalActive = activeStages.reduce((sum, s) => sum + stageCounts[s.key], 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Hiring Pipeline</CardTitle>
          <Badge variant="secondary">{totalActive} Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vertical Pipeline */}
        <div className="space-y-3">
          {activeStages.map((stage) => (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="w-32 text-sm truncate">{stage.label}</div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${stage.color}`}
                  style={{ width: `${Math.min(stageCounts[stage.key] * 25, 100)}%` }}
                />
              </div>
              <div className={`w-6 h-6 rounded-full ${stage.color} flex items-center justify-center text-xs font-bold text-white`}>
                {stageCounts[stage.key]}
              </div>
            </div>
          ))}
        </div>

        {/* Completed counts */}
        <div className="flex justify-between pt-2 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Hired: {stageCounts.hired}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Rejected: {stageCounts.rejected}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

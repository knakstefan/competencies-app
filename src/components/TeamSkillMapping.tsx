import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SkillMappingSkeleton } from "./skeletons/SkillMappingSkeleton";
import { labelToKey, getLevelBaseScore, getMaxChartScale, IC_LEVELS } from "@/lib/levelUtils";

interface TeamMember {
  _id: string;
  name: string;
  role: string;
}

interface Competency {
  _id: string;
  title: string;
  code: string;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 50%)',
  'hsl(340, 75%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(280, 65%, 60%)',
  'hsl(30, 80%, 55%)',
];

// Scoring weights matching the member Skill Overview chart.
// Member chart: above/well_above=4.5, target=3, below/well_below=1.5
// Below target: multiplicative scaling preserves the member chart's shape.
// Above target: additive scaling (max +1.5) keeps scores below the next level.
const EVALUATION_SCORES: Record<string, number> = {
  'well_below': 1.5,
  'below': 1.5,
  'target': 3,
  'above': 4.5,
  'well_above': 4.5,
};

interface TeamSkillMappingProps {
  roleId?: string;
}

export const TeamSkillMapping = ({ roleId }: TeamSkillMappingProps = {}) => {
  const globalData = useQuery(
    api.teamSkillData.getTeamSkillData,
    roleId ? "skip" : {}
  );
  const roleData = useQuery(
    api.teamSkillData.getTeamSkillDataByRole,
    roleId ? { roleId: roleId as any } : "skip"
  );
  const data = roleId ? roleData : globalData;

  if (data === undefined) {
    return <SkillMappingSkeleton />;
  }

  const { members, competencies, subCompetencies, latestAssessmentByMember, allProgress, allEvaluations } = data;

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Skill Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No team members found. Add team members to see the skill mapping.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Convert latestAssessmentByMember object to a Map for consistent usage
  const latestAssessmentMap = new Map<string, string>(
    Object.entries(latestAssessmentByMember)
  );

  // Create a map of progressId to evaluations for fast lookup
  const evaluationsByProgress = new Map<string, typeof allEvaluations>();
  allEvaluations.forEach(e => {
    if (!evaluationsByProgress.has(e.progressId)) {
      evaluationsByProgress.set(e.progressId, []);
    }
    evaluationsByProgress.get(e.progressId)!.push(e);
  });

  // Create a map of subCompetencyId to competencyId for fast lookup
  const subCompToCompetency = new Map<string, string>();
  subCompetencies.forEach(sc => {
    subCompToCompetency.set(sc._id, sc.competencyId);
  });

  // Calculate level-weighted skill scores for each member and competency
  // Formula: levelBaseScore + (avgEvaluation - 3) * weight
  // This positions members by their level and adjusts based on performance
  const levels = IC_LEVELS;
  const memberLevelKeys = members.map((m) => labelToKey(levels, m.role));
  const maxScale = getMaxChartScale(levels, memberLevelKeys);

  const chartData: any[] = competencies.map((comp) => {
    const dataPoint: any = { competency: comp.title };

    members.forEach((member) => {
      const latestAssessmentId = latestAssessmentMap.get(member._id);
      if (!latestAssessmentId) {
        dataPoint[member.name] = 0;
        return;
      }

      // Get all progress for this member's latest assessment that belongs to this competency
      const memberProgress = (allProgress || []).filter(p =>
        p.assessmentId === latestAssessmentId &&
        subCompToCompetency.get(p.subCompetencyId) === comp._id
      );

      if (memberProgress.length === 0) {
        dataPoint[member.name] = 0;
        return;
      }

      // Calculate average score using the same weights as the member Skill Overview chart.
      // Below target: multiplicative scaling (base * avg/3) preserves the member chart shape.
      // Above target: additive scaling (base + offset) so max score = base + 1.5,
      // which is always below the next level's base (base + 2).
      let totalScore = 0;
      let evalCount = 0;

      memberProgress.forEach((progress) => {
        const evaluations = evaluationsByProgress.get(progress._id) || [];
        evaluations.forEach((evaluation) => {
          evalCount++;
          totalScore += EVALUATION_SCORES[evaluation.evaluation] ?? 3;
        });
      });

      if (evalCount === 0) {
        dataPoint[member.name] = 0;
      } else {
        const avgScore = totalScore / evalCount;
        const memberLevelKey = labelToKey(levels, member.role);
        const baseScore = getLevelBaseScore(levels, memberLevelKey);
        if (avgScore <= 3) {
          // Below/at target: multiplicative preserves member chart ratios
          dataPoint[member.name] = baseScore * (avgScore / 3);
        } else {
          // Above target: additive, max +1.5 (stays below next level base of +2)
          dataPoint[member.name] = baseScore + (avgScore - 3);
        }
      }
    });

    return dataPoint;
  });

  const hasAnyData = chartData.some(point =>
    members.some(member => point[member.name] > 0)
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Team Skill Mapping</CardTitle>
          <Badge variant="secondary" className="text-xs">{members.length} Members</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {hasAnyData ? (
          <>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="55%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="competency"
                    tick={({ payload, x, y, textAnchor }: any) => {
                      const label = payload.value as string;
                      // Split long labels into two lines
                      const maxLen = 16;
                      let lines: string[];
                      if (label.length <= maxLen) {
                        lines = [label];
                      } else {
                        const mid = label.lastIndexOf(' ', maxLen);
                        const splitAt = mid > 0 ? mid : maxLen;
                        lines = [label.slice(0, splitAt), label.slice(splitAt).trimStart()];
                      }
                      return (
                        <text x={x} y={y} textAnchor={textAnchor} fontSize={10} className="fill-muted-foreground">
                          {lines.map((line, i) => (
                            <tspan key={i} x={x} dy={i === 0 ? 0 : 12}>{line}</tspan>
                          ))}
                        </text>
                      );
                    }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, maxScale]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  {members.map((member, index) => (
                    <Radar
                      key={member._id}
                      name=""
                      dataKey={member.name}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [value.toFixed(1), 'Level']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="border-t pt-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Base score by level (P1=2 … P5=10), scaled by evaluation. Below-target scales down proportionally; above-target adds up to +1.5.
              </p>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No assessment data available yet. Start assessing team members to see the skill mapping.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

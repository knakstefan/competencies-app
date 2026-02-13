import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SkillMappingSkeleton } from "./skeletons/SkillMappingSkeleton";
import { useRoleLevels } from "@/hooks/useRoleLevels";
import { buildLevelBaseScores, labelToKey, getMaxChartScale as sharedGetMaxChartScale } from "@/lib/levelUtils";

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

const EVALUATION_MODIFIERS: Record<string, number> = {
  'well_below': -2,
  'below': -1,
  'target': 0,
  'above': 2,
  'well_above': 4,
};

interface TeamSkillMappingProps {
  roleId?: string;
}

export const TeamSkillMapping = ({ roleId }: TeamSkillMappingProps = {}) => {
  const { levels } = useRoleLevels(roleId);
  const LEVEL_BASE_SCORES = buildLevelBaseScores(levels);
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

  // Calculate max scale based on team composition
  const memberLevelKeys = members.map((m: TeamMember) => labelToKey(levels, m.role));
  const maxScale = sharedGetMaxChartScale(levels, memberLevelKeys);

  // Convert latestAssessmentByMember object to a Map for consistent usage
  const latestAssessmentMap = new Map<string, string>(
    Object.entries(latestAssessmentByMember)
  );

  const latestAssessmentIds = Array.from(latestAssessmentMap.values());

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

  // Calculate skill levels for each member and competency
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

      // Get base score from member's level
      const memberKey = labelToKey(levels, member.role);
      const baseScore = LEVEL_BASE_SCORES[memberKey] || 4;

      // Calculate skill level: base + average evaluation modifier
      let totalModifier = 0;
      let evalCount = 0;

      memberProgress.forEach((progress) => {
        const evaluations = evaluationsByProgress.get(progress._id) || [];
        evaluations.forEach((evaluation) => {
          evalCount++;
          totalModifier += EVALUATION_MODIFIERS[evaluation.evaluation] || 0;
        });
      });

      if (evalCount === 0) {
        dataPoint[member.name] = 0;
      } else {
        const avgModifier = totalModifier / evalCount;
        // Score = base level score + evaluation modifier, clamped to dynamic max
        dataPoint[member.name] = Math.max(0, Math.min(maxScale, baseScore + avgModifier));
      }
    });

    return dataPoint;
  });

  const hasAnyData = chartData.some(point =>
    members.some(member => point[member.name] > 0)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Team Skill Mapping</CardTitle>
          <Badge variant="secondary">{members.length} Members</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Visual representation of team skills across all competencies
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAnyData ? (
          <>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="competency"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
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
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Scale: 0-{maxScale} (based on team composition + performance). Each level has a distinct base score with even 2-point spacing.
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

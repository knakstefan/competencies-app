import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";

interface SkillRecommendation {
  competencyId: string;
  competencyTitle: string;
  avgScore: number;
  priority: 'not_assessed' | 'high' | 'medium' | 'strength';
  description: string;
  memberCount: number;
}

const LEVEL_BASE_SCORES: Record<string, number> = {
  'associate': 2,
  'intermediate': 4,
  'senior': 7,
  'lead': 8,
  'principal': 8,
};

const EVALUATION_MODIFIERS: Record<string, number> = {
  'well_below': -2,
  'below': -1,
  'target': 0,
  'above': 2,
  'well_above': 4,
};

export const SkillsRecommendation = () => {
  const teamSkillData = useQuery(api.teamSkillData.getTeamSkillData);

  const loading = teamSkillData === undefined;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
          <Skeleton className="h-4 w-full mt-2" />
        </CardContent>
      </Card>
    );
  }

  const {
    members,
    competencies,
    subCompetencies,
    latestAssessmentByMember,
    allProgress,
    allEvaluations,
  } = teamSkillData;

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-warning" />
            Skills to Look For
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-center text-muted-foreground py-4 text-sm">
            Add team members and complete assessments to see skill recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build lookup maps
  const evaluationsByProgress = new Map<string, any[]>();
  allEvaluations.forEach((e: any) => {
    if (!evaluationsByProgress.has(e.progressId)) {
      evaluationsByProgress.set(e.progressId, []);
    }
    evaluationsByProgress.get(e.progressId)!.push(e);
  });

  const subCompToCompetency = new Map<string, string>();
  subCompetencies.forEach((sc: any) => {
    subCompToCompetency.set(sc._id, sc.competencyId);
  });

  // Calculate average scores per competency
  const competencyScores: SkillRecommendation[] = competencies.map((comp: any) => {
    let totalScore = 0;
    let memberCount = 0;

    members.forEach((member: any) => {
      const latestAssessmentId = latestAssessmentByMember[member._id];
      if (!latestAssessmentId) return;

      const memberProgress = allProgress.filter((p: any) =>
        p.assessmentId === latestAssessmentId &&
        subCompToCompetency.get(p.subCompetencyId) === comp._id
      );

      if (memberProgress.length === 0) return;

      const memberLevel = member.role.toLowerCase();
      const baseScore = LEVEL_BASE_SCORES[memberLevel] || 4;

      let totalModifier = 0;
      let evalCount = 0;

      memberProgress.forEach((progress: any) => {
        const evaluations = evaluationsByProgress.get(progress._id) || [];
        evaluations.forEach((evaluation: any) => {
          evalCount++;
          totalModifier += EVALUATION_MODIFIERS[evaluation.evaluation] || 0;
        });
      });

      if (evalCount > 0) {
        const avgModifier = totalModifier / evalCount;
        const memberScore = Math.max(0, Math.min(12, baseScore + avgModifier));
        totalScore += memberScore;
        memberCount++;
      }
    });

    const avgScore = memberCount > 0 ? totalScore / memberCount : 0;

    let priority: 'not_assessed' | 'high' | 'medium' | 'strength';
    let description: string;

    if (memberCount === 0) {
      priority = 'not_assessed';
      description = 'No team members have been evaluated';
    } else if (avgScore < 5) {
      priority = 'high';
      description = 'Team average is below target';
    } else if (avgScore < 7) {
      priority = 'medium';
      description = 'Room for improvement';
    } else {
      priority = 'strength';
      description = 'Team is strong in this area';
    }

    return {
      competencyId: comp._id,
      competencyTitle: comp.title,
      avgScore,
      priority,
      description,
      memberCount,
    };
  });

  // Sort by priority then by score
  const priorityOrder = { not_assessed: 0, high: 1, medium: 2, strength: 3 };
  competencyScores.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.avgScore - b.avgScore;
  });

  const recommendations = competencyScores.slice(0, 3);
  const hasData = competencyScores.some(r => r.avgScore > 0 || r.memberCount === 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-warning" />
            Skills to Look For
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-center text-muted-foreground py-4 text-sm">
            Add team members and complete assessments to see skill recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPriorityBadge = (priority: 'not_assessed' | 'high' | 'medium' | 'strength') => {
    switch (priority) {
      case 'not_assessed':
        return <Badge variant="outline" className="gap-1 border-dashed"><AlertTriangle className="h-3 w-3" />Not Assessed</Badge>;
      case 'high':
        return <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" />High Priority</Badge>;
      case 'medium':
        return <Badge className="gap-1 bg-warning text-warning-foreground hover:bg-warning/90"><Minus className="h-3 w-3" />Medium Priority</Badge>;
      case 'strength':
        return <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90"><TrendingUp className="h-3 w-3" />Strength</Badge>;
    }
  };

  const notAssessedSkill = recommendations.find(r => r.priority === 'not_assessed');
  const highPrioritySkill = recommendations.find(r => r.priority === 'high');
  const allStrengths = recommendations.every(r => r.priority === 'strength');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-warning" />
          Skills to Look For
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {recommendations.map((rec) => (
          <div
            key={rec.competencyId}
            className="flex items-center justify-between py-1.5"
          >
            <span className="text-sm">{rec.competencyTitle}</span>
            <div className="flex items-center gap-2">
              {rec.priority !== 'not_assessed' && (
                <span className="text-xs text-muted-foreground">{rec.avgScore.toFixed(1)}</span>
              )}
              {getPriorityBadge(rec.priority)}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
          {notAssessedSkill
            ? `Focus on candidates with ${notAssessedSkill.competencyTitle} experience.`
            : allStrengths
              ? "Your team is well-rounded! Consider candidates who can maintain these strengths."
              : highPrioritySkill
                ? `Focus on candidates with ${highPrioritySkill.competencyTitle} experience.`
                : "Look for candidates who can help elevate team skills."}
        </p>
      </CardContent>
    </Card>
  );
};

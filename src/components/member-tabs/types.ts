import type { RoleLevel } from "@/lib/levelUtils";
import type { OverallAssessmentSummary, AssessmentTrendData } from "@/hooks/useMemberAssessmentData";

export interface TeamMember {
  _id: string;
  name: string;
  role: string;
}

export interface Competency {
  _id: string;
  title: string;
  code: string;
  orderIndex: number;
}

export interface SubCompetency {
  _id: string;
  competencyId: string;
  title: string;
  code?: string;
  levelCriteria?: Record<string, string[]> | null;
  orderIndex: number;
}

export interface PlanContent {
  summary: string;
  trendingAnalysis?: {
    hasMultipleAssessments: boolean;
    assessmentCount: number;
    overallTrend: string;
    competencyTrends: Array<{
      competency: string;
      trend: string;
      change: number;
      insight: string;
    }>;
    trendSummary: string;
  };
  strengths?: Array<{
    title: string;
    description: string;
  }>;
  developmentAreas?: Array<{
    title: string;
    gap: string;
    actions: string[];
    timeline: string;
  }>;
  resources?: Array<{
    area: string;
    items: Array<{
      name: string;
      description: string;
      link?: string;
    }>;
  }>;
  milestones?: Array<{
    title: string;
    description: string;
  }>;
  timeline: string;
  fullPlan?: string;
}

export interface PromotionPlanData {
  _id: string;
  memberCurrentRole: string;
  targetLevel: string;
  generatedAt: string;
  planContent: PlanContent;
}

export interface OverallStats {
  score: number;
  above: number;
  target: number;
  below: number;
  total: number;
}

export interface CompetencyGapItem {
  _id: string;
  title: string;
  score: number;
  aboveCount: number;
  targetCount: number;
  belowCount: number;
  totalEvals: number;
  belowTargetSubs: Array<{
    subTitle: string;
    criteria: Array<{ text: string; evaluation: string }>;
  }>;
  nextLevelCriteriaCount: number;
  assessedCount: number;
  totalSubs: number;
}

export interface Progress {
  _id?: string;
  subCompetencyId: string;
  currentLevel: string;
  notes: string;
  evaluations?: Array<{
    _id?: string;
    progressId: string;
    criterionText: string;
    evaluation: "well_below" | "below" | "target" | "above" | "well_above";
  }>;
}

export interface TabCommonProps {
  member: TeamMember;
  isAdmin: boolean;
  roleId?: string;
  levels: RoleLevel[];
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  sortedAssessments: any[];
  completedAssessments: any[];
  progress: Record<string, Progress>;
  progressData: any[];
  trendData: AssessmentTrendData[];
  competencyGapData: CompetencyGapItem[];
  overallStats: OverallStats;
  overallSummary: OverallAssessmentSummary | null;
  currentLevelKey: string;
  targetLevelKey: string | null;
  plan: PromotionPlanData | null;
  planContent: PlanContent | null;
  readinessPercent: number;
  overallTrendLabel: string | null;
  assessmentDateRange: { from: string; to: string } | null;
  isPlanStale: boolean;
  getCompetencyTrend: (compId: string, scores: { aboveCount: number; targetCount: number; belowCount: number }) => string;
  getAssessmentDistribution: (assessmentId: string) => { above: number; target: number; below: number } | null;
}

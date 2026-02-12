export interface Competency {
  _id: string;
  title: string;
  code?: string;
  orderIndex: number;
  description?: string | null;
}

export interface SubCompetency {
  _id: string;
  competencyId: string;
  title: string;
  code?: string;
  associateLevel: string[] | null;
  intermediateLevel: string[] | null;
  seniorLevel: string[] | null;
  leadLevel: string[] | null;
  principalLevel: string[] | null;
  orderIndex: number;
}

export interface CriteriaEvaluation {
  _id?: string;
  progressId: string;
  criterionText: string;
  evaluation: 'well_below' | 'below' | 'target' | 'above' | 'well_above';
}

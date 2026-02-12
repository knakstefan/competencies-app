export interface Assessment {
  _id: string;
  memberId: string;
  createdBy?: string | null;
  _creationTime: number;
  completedAt?: string | null;
  status: 'draft' | 'completed';
  overallScore?: number | null;
  notes?: string | null;
  updatedAt?: string;
}

export interface AssessmentProgress {
  _id?: string;
  assessmentId: string;
  subCompetencyId: string;
  currentLevel: string;
  notes?: string;
}

export interface ModuleCatalogEntry {
  id: string;
  nameUk: string;
  nameEn: string;
  category: string;
}

export interface MetricStats {
  key: string;
  medianRelError: number;
}

export interface AssignmentStats {
  id: string;
  title: string;
  submissionCount: number;
  averageScore: number;
  passRate: number;
  metricErrors: MetricStats[];
}

export interface StudentSummary {
  userId: string;
  studentName: string;
  submissionCount: number;
  averageScore: number;
  passRate: number;
}

export interface ClassroomOverviewDto {
  assignments: AssignmentStats[];
  students: StudentSummary[];
}

export interface ScorePoint {
  submittedAt: string;
  score: number;
  assignmentTitle: string;
}

export interface StudentTimelineDto {
  userId: string;
  studentName: string;
  scoreOverTime: ScorePoint[];
  categoryMastery: Record<string, number | null>;
}

export interface PersonalAnalyticsDto {
  categoryMastery: Record<string, number | null>;
}

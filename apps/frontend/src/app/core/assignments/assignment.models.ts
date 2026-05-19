export interface ComparisonRowDto {
  key: string;
  expected: number;
  actual: number;
  absError: number;
  relError: number;
}

export interface SubmissionResultDto {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  submittedAt: string;
  gradingRows: ComparisonRowDto[];
}

export interface AssignmentSummaryDto {
  id: string;
  classroomId: string;
  moduleId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  createdAt: string;
  submissionCount: number;
  mySubmission: SubmissionResultDto | null;
}

export interface AssignmentDetailDto {
  id: string;
  classroomId: string;
  moduleId: string;
  title: string;
  description: string | null;
  expectedMetrics: Record<string, number>;
  dueAt: string | null;
  createdAt: string;
  isTeacher: boolean;
  mySubmission: SubmissionResultDto | null;
  submissions: SubmissionResultDto[];
}

export interface AssignmentCreateDto {
  classroomId: string;
  moduleId: string;
  title: string;
  description: string | null;
  expectedMetrics: Record<string, number>;
  dueAt: string | null;
}

export interface SubmitAssignmentDto {
  observedMetrics: Record<string, number>;
}

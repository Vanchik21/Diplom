export type AssignmentType = 0 | 1 | 2; // 0=Poe, 1=Scenario, 2=Quiz
export const AssignmentTypes = { Poe: 0, Scenario: 1, Quiz: 2 } as const;

export interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

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
  teacherScore?: number | null;
  hasConclusion: boolean;
  submittedAt: string;
  gradingRows: ComparisonRowDto[];
}

export interface AssignmentSummaryDto {
  id: string;
  classroomId: string;
  moduleId: string;
  title: string;
  description: string | null;
  assignmentType: AssignmentType;
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
  assignmentType: AssignmentType;
  expectedMetrics: Record<string, number>;
  questions: QuizQuestion[] | null;
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
  assignmentType: AssignmentType;
  expectedMetrics: Record<string, number>;
  questions: QuizQuestion[] | null;
  dueAt: string | null;
}

export interface SubmitAssignmentDto {
  observedMetrics: Record<string, number> | null;
  conclusionText: string | null;
  screenshotBase64: string | null;
  quizAnswers: number[] | null;
}

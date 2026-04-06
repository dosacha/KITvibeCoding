"use client";

export type UserRole = "admin" | "instructor" | "student";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  accessToken: string;
  user: SessionUser;
};

export type FrontendLoginResponse = {
  accessToken: string;
  user: SessionUser;
};

export type FrontendMeResponse = {
  user: SessionUser;
};

export type FrontendStudentExamItem = {
  id: string;
  name: string;
  date: string;
  totalScore: number;
  maxScore: number;
};

export type FrontendStudentListItem = {
  id: string;
  name: string;
  grade: string;
  classGroup: string | null;
  targetUniv: string | null;
  weaknessTypes: string[];
  recentExams: FrontendStudentExamItem[];
  consultPriority: "high" | "medium" | "low";
  gapScore: number;
};

export type FrontendDashboardStat = {
  label: string;
  value: string;
  sub?: string | null;
};

export type FrontendWeaknessDistributionItem = {
  weaknessTypeId: string;
  label: string;
  count: number;
};

export type FrontendExamTrendPoint = {
  name: string;
  averageScore: number;
};

export type FrontendWeakUnitItem = {
  unitId: number;
  unitName: string;
  subjectCode: string;
  mastery: number;
};

export type FrontendRecentStrategyItem = {
  studentId: string;
  studentName: string;
  consultPriority: "high" | "medium" | "low";
  weaknessTypes: string[];
  summary: string;
};

export type FrontendInstructorDashboardResponse = {
  stats: FrontendDashboardStat[];
  consultPriorityStudents: FrontendStudentListItem[];
  weaknessDistribution: FrontendWeaknessDistributionItem[];
  examTrend: FrontendExamTrendPoint[];
  weakUnits: FrontendWeakUnitItem[];
  recentStrategies: FrontendRecentStrategyItem[];
};

export type FrontendStudentSubjectItem = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  currentScore: number;
  targetScore: number;
  trend: number[];
  stability: number;
  universityWeight: number;
  isPreferred: boolean;
};

export type FrontendStudentDiagnosisSummary = {
  primaryWeaknessType: string | null;
  weaknessTypes: string[];
  evidence: Array<Record<string, unknown>>;
};

export type FrontendStudentStrategySummary = {
  summary: string;
  prioritySubjects: Array<Record<string, unknown>>;
  priorityUnits: Array<Record<string, unknown>>;
  timeAllocation: Array<Record<string, unknown>>;
  coachingPoints: string[];
  antiPatterns: string[];
};

export type FrontendStudentDetailResponse = {
  student: FrontendStudentListItem;
  subjects: FrontendStudentSubjectItem[];
  diagnosis: FrontendStudentDiagnosisSummary;
  strategy: FrontendStudentStrategySummary;
  weakUnits: FrontendWeakUnitItem[];
  targetGap: {
    university_name?: string;
    weighted_score?: number;
    target_score?: number;
    gap?: number;
  };
};

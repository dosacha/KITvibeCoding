export const SUBJECT_LABELS = {
  KOR: "국어",
  MATH: "수학",
  ENG: "영어",
  SCI: "과학탐구",
  SOC: "사회탐구",
};

export const WEAKNESS_LABELS = {
  wt1: "개념 이해 보완 필요",
  wt2: "계산 실수 주의",
  wt3: "시간 관리 보완 필요",
  wt4: "선행 개념 보완 필요",
  wt5: "문제 유형 편중",
  wt6: "성적 흐름 불안정",
};

export const PRIORITY_LABELS = {
  high: "먼저 보기",
  medium: "곧 보기",
  low: "안정권",
};

export const ROLE_LABELS = {
  admin: "관리자",
  instructor: "강사",
  student: "학생",
};

export const MENU_BY_ROLE = {
  admin: [
    { key: "instructor-dashboard", label: "강사용 요약" },
    { key: "students", label: "학생 목록" },
    { key: "exams", label: "시험 관리" },
    { key: "universities", label: "목표 대학 정책" },
  ],
  instructor: [
    { key: "instructor-dashboard", label: "강사용 요약" },
    { key: "students", label: "학생 목록" },
    { key: "exams", label: "시험 관리" },
    { key: "universities", label: "목표 대학 정책" },
  ],
  student: [{ key: "student-dashboard", label: "나의 학습 전략" }],
};

export const TEST_ACCOUNTS = [
  { role: "강사", email: "instructor@unitflow.ai", password: "password123" },
  { role: "학생", email: "student@unitflow.ai", password: "password123" },
  { role: "관리자", email: "admin@unitflow.ai", password: "password123" },
];

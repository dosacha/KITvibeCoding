export const instructorOverview = {
  generatedAt: "2026-04-06T18:00:00Z",
  students: [
    {
      name: "Student Park",
      weaknessType: "prerequisite_gap",
      weakSubjects: ["MATH", "ENG"],
      targetGap: 13.2,
      coachingPoints: [
        "확률 단원 이전에 함수 개념 재정비가 선행되어야 합니다.",
        "수학은 최근 상승률이 있어 단기 투자 효율이 큽니다."
      ]
    }
  ]
};

export const studentSnapshot = {
  name: "Student Park",
  currentPosition: "서울미래대 컴퓨터공학 기준 가중 환산 70.8점, 목표 대비 13.2점 부족",
  diagnosis: {
    type: "prerequisite_gap",
    reasons: [
      "함수와 확률 단원 이해도가 모두 60% 미만입니다.",
      "선행 단원과 연결된 약점이 반복되어 기초 결손 가능성이 큽니다.",
      "수학 반영 비중이 높아 현재 격차에 미치는 영향이 큽니다."
    ]
  },
  strategy: {
    subjects: ["MATH", "ENG", "KOR"],
    units: ["Functions", "Probability", "Reading Inference"],
    allocations: ["MATH 44%", "ENG 31%", "KOR 25%"],
    antiPatterns: [
      "모든 과목을 비슷한 비율로 공부하기",
      "확률 단원을 건너뛰고 실전 문제만 늘리기",
      "점수 상승 여지가 낮은 영역에 긴 시간을 고정 투자하기"
    ]
  }
};

export type InstructorDemoResponse = {
  generated_at: string;
  students: Array<{
    student_name: string;
    student_profile_id: number;
    primary_weakness_type: string | null;
    weak_subjects: Array<{ subject_code: string }>;
    target_gap: number | null;
    coaching_points: string[];
  }>;
};

export type StudentDemoResponse = {
  student_name: string;
  current_position_summary: string;
  diagnosis: {
    primary_weakness_type: string;
    evidence: Array<{ reason: string }>;
  } | null;
  strategy: {
    structured_plan: {
      priority_subjects: Array<{ subject_code: string }>;
      priority_units: Array<{ unit_name: string }>;
      time_allocation: Array<{ subject_code: string; ratio_percent: number }>;
      anti_patterns: string[];
    };
  } | null;
};

export const instructorOverview = {
  generatedAt: "2026-04-06T18:00:00Z",
  students: [
    {
      name: "Student Park",
      weaknessType: "prerequisite_gap",
      weakSubjects: ["MATH", "ENG"],
      targetGap: 13.2,
      coachingPoints: [
        "확률 단원 이전 함수 개념 재정비 우선",
        "수학 최근 상승률 반영 시 단기 투자 효율 우세"
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
      "함수와 확률 단원 이해도 모두 60% 미만",
      "선행 단원과 연결된 약점 반복으로 기초 결손 가능성 확대",
      "수학 반영 비중이 높아 현재 격차 영향이 큼"
    ]
  },
  strategy: {
    subjects: ["MATH", "ENG", "KOR"],
    units: ["Functions", "Probability", "Reading Inference"],
    allocations: ["MATH 44%", "ENG 31%", "KOR 25%"],
    antiPatterns: [
      "모든 과목을 비슷한 비율로 공부하기",
      "취약 단원 건너뛴 채 실전 문제만 늘리기",
      "점수 상승 여지가 낮은 영역에 긴 시간 고정 투자하기"
    ]
  }
};


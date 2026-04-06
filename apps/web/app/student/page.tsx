import { NarrativeCard, StatCard } from "../../components/cards";
import { StudentDemoResponse, studentSnapshot } from "../../components/mock-data";

async function getStudentDemo(): Promise<StudentDemoResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return null;
  }
  try {
    const response = await fetch(`${baseUrl}/dashboard/demo/student`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as StudentDemoResponse;
  } catch {
    return null;
  }
}

export default async function StudentPage() {
  const apiData = await getStudentDemo();
  const diagnosisReasons = apiData?.diagnosis?.evidence?.map((item) => item.reason) ?? studentSnapshot.diagnosis.reasons;
  const units = apiData?.strategy?.structured_plan.priority_units.map((item) => item.unit_name) ?? studentSnapshot.strategy.units;
  const allocations =
    apiData?.strategy?.structured_plan.time_allocation.map((item) => `${item.subject_code} ${item.ratio_percent}%`) ??
    studentSnapshot.strategy.allocations;
  const antiPatterns = apiData?.strategy?.structured_plan.anti_patterns ?? studentSnapshot.strategy.antiPatterns;
  const subjects =
    apiData?.strategy?.structured_plan.priority_subjects.map((item) => item.subject_code) ?? studentSnapshot.strategy.subjects;
  const titleName = apiData?.student_name ?? studentSnapshot.name;
  const currentPosition = apiData?.current_position_summary ?? studentSnapshot.currentPosition;
  const diagnosisType = apiData?.diagnosis?.primary_weakness_type ?? studentSnapshot.diagnosis.type;

  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">Student Dashboard</div>
        <h1>{titleName} 학생의 현재 위치와 다음 4주 전략</h1>
        <p className="muted">{currentPosition}</p>
        <div className="badge">{apiData ? "API 연동 데모" : "로컬 목업 데모"}</div>
      </section>

      <section className="grid three">
        <StatCard label="Diagnosis Type" value={diagnosisType} detail="현재 가장 큰 병목으로 판단된 취약 유형" />
        <StatCard label="Priority Subjects" value={subjects.slice(0, 2).join(" / ")} detail="대학 반영 비중과 상승 효율을 반영한 우선 과목" />
        <StatCard label="Time Allocation" value={allocations[0]} detail="가장 먼저 집중할 추천 학습 비중" />
      </section>

      <section className="grid two">
        <NarrativeCard title="왜 이런 전략인가" items={diagnosisReasons} />
        <NarrativeCard title="우선 보완 단원" items={units} />
      </section>

      <section className="grid two">
        <NarrativeCard title="추천 시간 배분" items={allocations} />
        <NarrativeCard title="피해야 할 패턴" items={antiPatterns} />
      </section>
    </main>
  );
}

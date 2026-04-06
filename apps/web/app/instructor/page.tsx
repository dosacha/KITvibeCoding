import { NarrativeCard, StatCard } from "../../components/cards";
import { InstructorDemoResponse, instructorOverview } from "../../components/mock-data";

async function getInstructorDemo(): Promise<InstructorDemoResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return null;
  }
  try {
    const response = await fetch(`${baseUrl}/dashboard/demo/instructor`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as InstructorDemoResponse;
  } catch {
    return null;
  }
}

export default async function InstructorPage() {
  const apiData = await getInstructorDemo();
  const student = apiData
    ? {
        name: apiData.students[0]?.student_name ?? instructorOverview.students[0].name,
        weaknessType: apiData.students[0]?.primary_weakness_type ?? instructorOverview.students[0].weaknessType,
        weakSubjects: apiData.students[0]?.weak_subjects.map((subject) => subject.subject_code) ?? instructorOverview.students[0].weakSubjects,
        targetGap: apiData.students[0]?.target_gap ?? instructorOverview.students[0].targetGap,
        coachingPoints: apiData.students[0]?.coaching_points ?? instructorOverview.students[0].coachingPoints
      }
    : instructorOverview.students[0];

  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">Instructor Dashboard</div>
        <h1>학생 진단 요약과 상담 우선순위를 한 화면에서 확인</h1>
        <p className="muted">
          강사는 취약 유형, 취약 과목, 목표 대학 대비 갭, 상담 포인트를 빠르게 파악하고
          피드백을 점수 나열이 아니라 개선 가능한 행동 단위로 전달할 수 있습니다.
        </p>
        <div className="badge">{apiData ? "API 연동 데모" : "로컬 목업 데모"}</div>
      </section>

      <section className="grid three">
        <StatCard label="Student" value={student.name} detail="현재 데모 데이터 기준 대표 학생" />
        <StatCard label="Weakness Type" value={student.weaknessType} detail="설명 가능한 규칙 기반 진단 결과" />
        <StatCard label="Target Gap" value={`${student.targetGap} pts`} detail="목표 대학 환산 점수 대비 부족분" />
      </section>

      <section className="grid two">
        <NarrativeCard title="Weak Subjects" items={student.weakSubjects.map((subject) => `${subject} 과목 보강 우선`)} />
        <NarrativeCard title="Coaching Points" items={student.coachingPoints} />
      </section>
    </main>
  );
}

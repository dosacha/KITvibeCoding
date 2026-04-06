import Link from "next/link";
import { NarrativeCard, StatCard } from "../components/cards";

export default function HomePage() {
  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">UnitFlow AI</div>
        <h1>학생별 진단과 목표 대학 맞춤 학습 전략</h1>
        <p className="muted">
          학생은 지금 무엇을 먼저 공부해야 하는지 보고, 강사는 누구를 먼저 상담해야 하는지 바로 확인할 수 있어.
        </p>
        <div className="nav-links">
          <Link href="/instructor">강사용 화면 보기</Link>
          <Link href="/student">학생용 화면 보기</Link>
        </div>
      </section>

      <section className="grid three">
        <StatCard label="진단" value="6가지 유형" detail="개념 이해, 계산 실수, 시간 관리, 선행 개념 부족 같은 취약 유형을 설명과 함께 보여줘." />
        <StatCard label="학습 전략" value="4주 집중" detail="우선 과목, 단원 순서, 시간 배분, 피해야 할 공부 방식까지 한 번에 정리해." />
        <StatCard label="근거 제시" value="데이터 기반" detail="최근 시험 점수, 단원 이해도, 목표 대학 반영 비율을 함께 보여줘." />
      </section>

      <section className="grid two">
        <NarrativeCard
          title="지금 할 수 있는 일"
          items={[
            "학생별 취약 유형과 취약 단원 확인",
            "목표 대학 기준 점수 차이 계산",
            "과목별 우선순위와 시간 배분 추천",
            "강사용 상담 포인트와 학생용 실행 전략 제공"
          ]}
        />
        <NarrativeCard
          title="운영 기준"
          items={[
            "역할별 로그인과 권한 분리",
            "재계산 가능한 진단 구조",
            "감사 로그와 수정 이력 기록",
            "설명 가능한 규칙 기반 전략 엔진"
          ]}
        />
      </section>
    </main>
  );
}

import Link from "next/link";
import { NarrativeCard, StatCard } from "../components/cards";

export default function HomePage() {
  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">UnitFlow AI MVP</div>
        <h1>설명 가능한 진단과 목표 대학 맞춤 전략을 중심에 둔 교육 AI</h1>
        <p className="muted">
          이 MVP는 단순 성적판이 아니라 학생의 취약 유형, 단원 이해도, 점수 추세,
          목표 대학 반영 규칙을 함께 분석해 강사와 학생 모두에게 실행 가능한 전략을 제시합니다.
        </p>
        <div className="nav-links">
          <Link href="/instructor">강사용 대시보드 보기</Link>
          <Link href="/student">학생용 대시보드 보기</Link>
        </div>
      </section>

      <section className="grid three">
        <StatCard label="Diagnosis" value="6 Types" detail="개념 이해 부족형부터 변동성 높은 불안정형까지 구조화된 규칙 기반 진단" />
        <StatCard label="Strategy" value="4 Weeks" detail="4주 우선 과목, 단원 보완 순서, 시간 배분, 상담 포인트를 구조화" />
        <StatCard label="Explainability" value="Data-backed" detail="추천 결과마다 근거 데이터와 정책 기반 설명을 함께 제공" />
      </section>

      <section className="grid two">
        <NarrativeCard
          title="MVP 핵심 흐름"
          items={[
            "시험 결과와 문제별 단원 태깅으로 feature set 생성",
            "취약 유형 진단과 목표 대학 대비 격차 계산",
            "과목 우선순위와 시간 배분 추천 생성",
            "강사 상담 포인트와 학생 실행 전략 동시 제공"
          ]}
        />
        <NarrativeCard
          title="운영 설계"
          items={[
            "역할 기반 권한 분리",
            "재계산 가능한 분석 구조",
            "감사 로그와 수정 이력 테이블 포함",
            "LLM 없이도 동작하는 결정론적 기본 경로 유지"
          ]}
        />
      </section>
    </main>
  );
}

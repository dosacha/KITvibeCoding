import { useAuth } from "../contexts/AuthContext.jsx";
import { apiClient } from "../lib/apiClient.js";
import { formatPercent, formatScore, toSubjectLabel, toWeaknessLabel } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { ListCard } from "../components/common/ListCard.jsx";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { StatCard } from "../components/common/StatCard.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";

export function StudentDashboardPage() {
  const { session } = useAuth();
  const { data, error, loading } = useAsyncData(() => apiClient.getStudentDashboard(session.accessToken), [session.accessToken]);

  const timeAllocation = (data?.strategy?.timeAllocation ?? []).map(
    (item) =>
      `${toSubjectLabel(String(item.subject_code ?? item.subjectCode ?? "-"))} ${formatPercent(
        item.ratio_percent ?? item.ratioPercent,
      )}`,
  );

  return (
    <div className="page-grid">
      <section className="hero-card">
        <h1>{data?.student?.name ?? "학생"} 학생의 지금 해야 할 공부</h1>
        <p className="muted">
          {data
            ? `${data.targetGap.university_name ?? "목표 대학"} 기준 현재 점수는 ${formatScore(
                data.targetGap.weighted_score,
              )}점이고, 목표까지 ${formatScore(data.targetGap.gap)} 차이가 있어.`
            : "현재 위치를 정리하고 있어."}
        </p>
        {loading ? <LoadingPanel title="학생 전략을 불러오는 중" description="진단과 학습 전략을 정리하고 있어." /> : null}
        {error ? <StatusBox tone="error" title="화면을 불러오지 못했어" description={error} /> : null}
      </section>

      <section className="stats-grid">
        <StatCard
          label="현재 진단"
          value={data?.diagnosis?.primaryWeaknessType ? toWeaknessLabel(data.diagnosis.primaryWeaknessType) : "진단 대기"}
          description="최근 시험과 단원 이해도를 바탕으로 정리"
        />
        <StatCard
          label="먼저 올릴 과목"
          value={
            (data?.strategy?.prioritySubjects ?? [])
              .slice(0, 2)
              .map((item) => toSubjectLabel(String(item.subject_code ?? item.subjectCode ?? "-")))
              .join(" / ") || "-"
          }
          description="목표 대학 반영과 최근 흐름을 함께 반영"
        />
        <StatCard
          label="가장 먼저 쓸 시간"
          value={timeAllocation[0] ?? "-"}
          description="이번 주 공부 시간 배분의 시작점"
        />
      </section>

      <section className="two-grid">
        <ListCard title="한눈에 보는 전략" items={data?.strategy?.studentSummary ? [data.strategy.studentSummary] : []} />
        <ListCard
          title="전략 신뢰도"
          items={data?.strategy?.confidenceLevel ? [`신뢰도: ${data.strategy.confidenceLevel}`, data.strategy.confidenceMessage] : []}
        />
      </section>

      <section className="two-grid">
        <ListCard
          title="왜 이런 전략을 제안할까"
          items={(data?.diagnosis?.evidence ?? []).map((item) => String(item.reason ?? "근거 확인 필요"))}
        />
        <ListCard
          title="먼저 보완할 단원"
          items={(data?.strategy?.priorityUnits ?? []).map((item) => String(item.unit_name ?? item.unitName ?? "-"))}
        />
      </section>

      <section className="two-grid">
        <ListCard title="추천 시간 배분" items={timeAllocation} />
        <ListCard title="피하면 좋은 공부 방식" items={data?.strategy?.antiPatterns ?? []} />
      </section>
    </div>
  );
}

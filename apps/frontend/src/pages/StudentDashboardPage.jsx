// apps/frontend/src/pages/StudentDashboardPage.jsx
import { Brain, Target, Clock, TrendingUp, BookOpen, AlertTriangle, Lightbulb } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../contexts/AuthContext.jsx";
import { apiClient } from "../lib/apiClient.js";
import { formatPercent, formatScore, toSubjectLabel } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { StatCard } from "../components/common/StatCard.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { AIBadge, SectionHeader, ProgressBar, GlassTooltip } from "../components/common/VisualParts.jsx";
import { FirstVisitHint } from "../components/feedback/FirstVisitHint.jsx";

export function StudentDashboardPage() {
  const { session } = useAuth();
  const { data, error, loading } = useAsyncData(() => apiClient.getStudentDashboard(session.accessToken), [session.accessToken]);

  const gap = data?.targetGap;
  const strat = data?.strategy;
  const diag = data?.diagnosis;
  const timeAlloc = (strat?.timeAllocation ?? []).map((i) =>
    `${toSubjectLabel(String(i.subject_code ?? i.subjectCode ?? "-"))} ${formatPercent(i.ratio_percent ?? i.ratioPercent)}`
  );
  const trendData = (data?.student?.recentExams ?? []).map((e) => ({
    name: e.name?.slice(0, 4) ?? "", 점수: e.totalScore ?? e.raw_score ?? 0,
  }));

  return (
    <div className="page-grid">
      {/* 그라데이션 히어로 */}
      <section className="hero-card" style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.88), rgba(124,58,237,0.82))",
        color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 12px 40px rgba(59,130,246,0.25)",
      }}>
        <FirstVisitHint id="student-welcome" title="나의 학습 전략 화면이에요" description="AI가 분석한 진단 결과와 맞춤 전략을 확인할 수 있어요." />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>AI 진단</span>
          <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>맞춤 전략</span>
          {gap?.university_name && <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>{gap.university_name}</span>}
        </div>
        <h1 style={{ color: "#fff" }}>{data?.student?.name ?? session.user.name}님, 지금 해야 할 공부</h1>
        <p style={{ fontSize: 15, opacity: 0.9, marginTop: 6 }}>
          {gap ? `${gap.university_name ?? "목표 대학"} 기준 현재 ${formatScore(gap.weighted_score)}, 목표까지 ${formatScore(gap.gap)} 차이` : "현재 위치를 분석하고 있어요."}
        </p>
        {loading && <div style={{ marginTop: 10, opacity: 0.8 }}>불러오는 중...</div>}
        {error && <StatusBox tone="error" title="불러오기 실패" description={error} />}
      </section>

      {/* 핵심 수치 */}
      <section className="stats-grid">
        <StatCard icon={Brain} label="현재 진단" value={diag?.primaryWeaknessType ? toSubjectLabel(diag.primaryWeaknessType) : "진단 대기"} description="최근 시험 기반 분석" color="#7C3AED" />
        <StatCard icon={Target} label="집중 과목" value={(strat?.prioritySubjects ?? []).slice(0, 2).map((i) => toSubjectLabel(String(i.subject_code ?? i.subjectCode ?? "-"))).join(" · ") || "-"} description="목표 대학 반영 고려" color="#3B82F6" />
        <StatCard icon={Clock} label="시간 배분" value={timeAlloc[0] ?? "-"} description="이번 주 시작점" color="#F59E0B" />
      </section>

      {/* AI 전략 요약 */}
      {strat?.studentSummary && (
        <section className="hero-card" style={{ border: "1px solid rgba(124,58,237,0.18)", background: "linear-gradient(135deg, rgba(124,58,237,0.05), rgba(255,255,255,0.45))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><AIBadge /><span style={{ fontSize: 15, fontWeight: 700 }}>나의 학습 전략</span></div>
          <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.75 }}>{strat.studentSummary}</p>
        </section>
      )}

      {/* 근거 + 보완 단원 */}
      <section className="two-grid">
        <section className="panel">
          <SectionHeader icon={Lightbulb} title="왜 이런 전략을 제안할까요?" />
          {(diag?.evidence ?? []).length > 0 ? diag.evidence.map((e, i) => (
            <div key={i} style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 12, background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.35)", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{e.reason ?? "근거 확인 중"}</div>
          )) : <StatusBox tone="empty" title="근거 수집 중" description="진단 데이터가 쌓이면 표시돼요." />}
        </section>
        <section className="panel">
          <SectionHeader icon={BookOpen} title="먼저 보완할 단원" />
          {(strat?.priorityUnits ?? []).map((u, i) => (
            <div key={i} style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 12, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", fontSize: 13 }}>{u.unit_name ?? u.unitName ?? "-"}</div>
          ))}
          {(strat?.priorityUnits ?? []).length === 0 && <StatusBox tone="empty" title="계산 중" description="계산 후 표시돼요." />}
        </section>
      </section>

      {/* 성장 추이 + 시간 배분 */}
      <section className="two-grid">
        {trendData.length > 1 && (
          <section className="panel">
            <SectionHeader icon={TrendingUp} title="나의 성장 추이" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs><linearGradient id="gStu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#94A3B8" }} /><Tooltip content={<GlassTooltip />} />
                <Area type="monotone" dataKey="점수" stroke="#7C3AED" fill="url(#gStu)" strokeWidth={2.5} dot={{ r: 4, fill: "#7C3AED", strokeWidth: 2, stroke: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </section>
        )}
        <section className="panel">
          <SectionHeader icon={Clock} title="추천 시간 배분" />
          {timeAlloc.length > 0 ? timeAlloc.map((t2, i) => (
            <div key={i} style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 12, background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.35)", fontSize: 13 }}>{t2}</div>
          )) : <StatusBox tone="empty" title="계산 중" description="" />}
        </section>
      </section>

      {/* 피해야 할 패턴 */}
      {(strat?.antiPatterns ?? []).length > 0 && (
        <section className="panel">
          <SectionHeader icon={AlertTriangle} title="피하면 좋은 공부 방식" />
          {strat.antiPatterns.map((p, i) => (
            <div key={i} style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 12, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.10)", fontSize: 13, color: "#475569" }}>{p}</div>
          ))}
        </section>
      )}
    </div>
  );
}

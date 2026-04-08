// apps/frontend/src/pages/InstructorDashboardPage.jsx
import { Users, AlertTriangle, TrendingUp, Brain, Target, ChevronRight, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useRouter } from "../router/hashRouter.js";
import { apiClient } from "../lib/apiClient.js";
import { formatPercent, formatScore, toWeaknessLabel } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { StatCard } from "../components/common/StatCard.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { AIBadge, WeaknessBadge, PriorityBadge, ProgressBar, SectionHeader, GlassTooltip } from "../components/common/VisualParts.jsx";
import { FirstVisitHint } from "../components/feedback/FirstVisitHint.jsx";

export function InstructorDashboardPage() {
  const { session } = useAuth();
  const { pathname, navigate } = useRouter();
  const bp = pathname.startsWith("/admin") ? "/admin/students" : "/teacher/students";
  const { data, error, loading } = useAsyncData(() => apiClient.getInstructorDashboard(session.accessToken), [session.accessToken]);

  const pri = data?.consultPriorityStudents?.[0];
  const latest = data?.examTrend?.length ? data.examTrend[data.examTrend.length - 1] : null;
  const wDist = (data?.weaknessDistribution ?? []).filter((w) => w.count > 0);
  const avgTr = (data?.examTrend ?? []).map((e) => ({ name: e.name?.slice(0, 4) ?? "", 평균: e.averageScore }));
  const highCount = (data?.consultPriorityStudents ?? []).filter((s) => s.consultPriority === "high").length;

  return (
    <div className="page-grid">
      {/* 히어로 */}
      <section className="hero-card">
        <FirstVisitHint id="instructor-welcome" title="강사 대시보드입니다" description="우선 상담 학생, 취약 유형, 시험 추이를 한눈에 확인하세요. 학생 이름을 클릭하면 상세 화면으로 이동해요." />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><AIBadge /><span style={{ fontSize: 11, color: "#94A3B8" }}>실시간 분석</span></div>
        <h1>오늘 먼저 볼 학생과 상담 포인트</h1>
        <p className="muted" style={{ fontSize: 15 }}>우선 상담 학생, 취약 유형, 시험 흐름을 한눈에 확인할 수 있어요.</p>
        {loading ? <LoadingPanel title="요약을 불러오는 중" description="학생 진단을 정리하고 있어요." /> : null}
        {error ? <StatusBox tone="error" title="불러오기 실패" description={error} /> : null}
      </section>

      {/* 핵심 수치 */}
      <section className="stats-grid">
        <StatCard icon={Users} label="관리 학생" value={`${data?.consultPriorityStudents?.length ?? "-"}명`} description={highCount > 0 ? `우선 상담 ${highCount}명` : "등록 기준"} color="#3B82F6" />
        <StatCard icon={AlertTriangle} label="우선 상담" value={pri?.name ?? "-"} description={pri ? `격차 ${formatScore(pri.gapScore)}` : "없음"} color="#EF4444" />
        <StatCard icon={TrendingUp} label="최근 평균" value={latest ? formatScore(latest.averageScore) : "-"} description={latest?.name ?? ""} color="#10B981" />
        <StatCard icon={Brain} label="주요 취약 유형" value={wDist[0]?.label ?? "-"} description="최근 진단 기준" color="#7C3AED" />
      </section>

      {/* 상담 우선 학생 + 평균 추이 차트 */}
      <section className="two-grid">
        <section className="panel">
          <SectionHeader icon={AlertTriangle} title="상담 우선 학생" subtitle="목표 대비 갭이 크거나 변동이 큰 학생" />
          {(data?.consultPriorityStudents ?? []).length === 0 && !loading ? (
            <StatusBox tone="empty" title="표시할 학생이 없어요" description="데이터가 쌓이면 표시돼요." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(data?.consultPriorityStudents ?? []).slice(0, 5).map((s) => (
                <div key={s.id} onClick={() => navigate(`${bp}/${s.id}`)} className="list-item-hover" style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14,
                  background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.35)",
                  cursor: "pointer", transition: "all 0.2s",
                  backdropFilter: "blur(12px)",
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "#3B82F615", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#3B82F6", fontSize: 15 }}>{s.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <strong style={{ fontSize: 14 }}>{s.name}</strong>
                      <PriorityBadge priority={s.consultPriority} />
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{s.targetUniv ?? ""} · 갭 {formatScore(s.gapScore)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(s.weaknessTypes ?? []).slice(0, 2).map((wt) => <WeaknessBadge key={wt} typeId={wt} small />)}
                  </div>
                  <ChevronRight size={14} color="#94A3B8" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <SectionHeader icon={TrendingUp} title="전체 평균 추이" subtitle="최근 시험별 반 평균" />
          {avgTr.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={avgTr}>
                <defs>
                  <linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip content={<GlassTooltip />} />
                <Area type="monotone" dataKey="평균" stroke="#7C3AED" strokeWidth={2.5} fill="url(#gAvg)" dot={{ r: 4, fill: "#7C3AED", strokeWidth: 2, stroke: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <StatusBox tone="empty" title="시험 데이터 없음" description="시험 결과가 쌓이면 추이를 보여드려요." />
          )}
        </section>
      </section>

      {/* 취약 유형 분포 + 보완 단원 */}
      <section className="two-grid">
        <section className="panel">
          <SectionHeader icon={Brain} title="취약 유형 분포" subtitle="전체 학생 진단 결과" />
          {wDist.length > 0 ? wDist.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                {({ "개념 이해 보완 필요": "🧩", "계산 실수 주의": "🔢", "시간 관리 보완 필요": "⏱️", "선행 개념 보완 필요": "🔗", "문제 유형 편중": "📊", "성적 흐름 불안정": "📈" })[w.label] ?? "📊"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{w.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{w.count}명</span>
                </div>
                <ProgressBar value={w.count} max={Math.max(...wDist.map((x) => x.count), 1)} color="#7C3AED" height={6} />
              </div>
            </div>
          )) : <StatusBox tone="empty" title="데이터 수집 중" description="진단 결과가 쌓이면 표시돼요." />}
        </section>

        <section className="panel">
          <SectionHeader icon={Target} title="보완 필요 단원 TOP 5" subtitle="이해도 낮은 단원" />
          {(data?.weakUnits ?? []).slice(0, 5).map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 8,
                background: i < 2 ? "#EF444412" : "#F59E0B12",
                color: i < 2 ? "#EF4444" : "#F59E0B",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
              }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{u.unitName}</div>
                <ProgressBar value={u.mastery} max={100} color={u.mastery < 50 ? "#EF4444" : u.mastery < 65 ? "#F59E0B" : "#3B82F6"} height={5} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: u.mastery < 50 ? "#EF4444" : "#475569" }}>{formatPercent(u.mastery)}</span>
            </div>
          ))}
          {(data?.weakUnits ?? []).length === 0 && !loading && <StatusBox tone="empty" title="데이터 없음" description="단원별 이해도가 계산되면 표시돼요." />}
        </section>
      </section>

      {/* AI 전략 요약 */}
      {(data?.recentStrategies ?? []).length > 0 && (
        <section className="panel">
          <SectionHeader icon={Sparkles} title="최근 AI 전략 요약" action={<AIBadge />} />
          <div className="three-grid">
            {data.recentStrategies.slice(0, 3).map((item, i) => (
              <div key={i} style={{
                padding: 16, borderRadius: 16,
                background: "linear-gradient(135deg, rgba(124,58,237,0.05), rgba(255,255,255,0.3))",
                border: "1px solid rgba(124,58,237,0.12)",
              }}>
                <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.65 }}>{item.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

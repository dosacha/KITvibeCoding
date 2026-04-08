// apps/frontend/src/pages/StudentDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Brain, Target, Calendar, BarChart3, TrendingUp, BookOpen, Users, FileText, ArrowLeft, RefreshCw } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useRouter } from "../router/hashRouter.js";
import { apiClient } from "../lib/apiClient.js";
import { formatPercent, formatScore, toSubjectLabel } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { StatCard } from "../components/common/StatCard.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { Tabs } from "../components/common/Tabs.jsx";
import { AIBadge, WeaknessBadge, GapBar, ProgressBar, SectionHeader, GlassTooltip, SUBJECT_COLORS } from "../components/common/VisualParts.jsx";

function emptyForm() { return { exam_id: "", raw_score: "", percentile: "", grade: "", completed_in_seconds: "" }; }

export function StudentDetailPage({ studentId }) {
  const { session } = useAuth();
  const { pathname, navigate } = useRouter();
  const backPath = pathname.startsWith("/admin") ? "/admin/students" : "/teacher/students";
  const [rf, setRf] = useState(emptyForm());
  const [qr, setQr] = useState({});
  const [msg, setMsg] = useState("");
  const [rmsg, setRmsg] = useState("");

  const detail = useAsyncData(() => apiClient.getStudentDetail(session.accessToken, studentId), [session.accessToken, studentId]);
  const numId = Number(String(studentId).replace(/^st/, ""));
  const results = useAsyncData(() => apiClient.getStudentResults(session.accessToken, numId), [session.accessToken, studentId]);
  const exams = useAsyncData(() => apiClient.getExams(session.accessToken), [session.accessToken]);
  const questions = useAsyncData(() => rf.exam_id ? apiClient.getExamQuestions(session.accessToken, Number(rf.exam_id)) : Promise.resolve([]), [session.accessToken, rf.exam_id]);

  const savedResult = useMemo(() => (results.data ?? []).find((r) => String(r.exam_id) === String(rf.exam_id)), [results.data, rf.exam_id]);
  useEffect(() => {
    if (!savedResult) { setRf((p) => ({ ...p, percentile: "", grade: "", completed_in_seconds: "" })); return; }
    setRf((p) => ({ ...p, raw_score: String(savedResult.raw_score ?? ""), percentile: savedResult.percentile != null ? String(savedResult.percentile) : "", grade: savedResult.grade != null ? String(savedResult.grade) : "", completed_in_seconds: savedResult.completed_in_seconds != null ? String(savedResult.completed_in_seconds) : "" }));
  }, [savedResult]);
  useEffect(() => {
    const qs = questions.data ?? [];
    if (!qs.length) { setQr({}); return; }
    const saved = savedResult?.question_breakdown ?? {};
    setQr(Object.fromEntries(qs.map((q) => [q.id, { is_correct: Boolean(saved[String(q.id)]?.is_correct), points: q.points }])));
  }, [questions.data, savedResult]);

  const calcScore = useMemo(() => { const qs = questions.data ?? []; if (!qs.length) return Number(rf.raw_score || 0); return qs.reduce((t, q) => t + (qr[q.id]?.is_correct ? Number(q.points) : 0), 0); }, [qr, questions.data, rf.raw_score]);
  const latestExam = useMemo(() => { const r = detail.data?.student?.recentExams ?? []; return r.length ? r[r.length - 1].name : "-"; }, [detail.data]);

  async function saveResult(e) { e.preventDefault(); setMsg(""); try { await apiClient.saveStudentResult(session.accessToken, { student_profile_id: numId, exam_id: Number(rf.exam_id), raw_score: calcScore, percentile: rf.percentile ? Number(rf.percentile) : null, grade: rf.grade ? Number(rf.grade) : null, completed_in_seconds: rf.completed_in_seconds ? Number(rf.completed_in_seconds) : null, question_breakdown: Object.fromEntries(Object.entries(qr).map(([k, v]) => [String(k), v])), result_metadata: { source: "frontend_manual" } }); setMsg("결과를 저장하고 전략을 다시 계산했어요."); results.reload(); detail.reload(); } catch (e) { setMsg(e instanceof Error ? e.message : "저장 실패"); } }
  async function recalc() { setRmsg(""); try { await apiClient.recalculateStudent(session.accessToken, numId); setRmsg("진단과 전략을 다시 계산했어요."); detail.reload(); } catch (e) { setRmsg(e instanceof Error ? e.message : "재계산 실패"); } }

  const d = detail.data;
  const radarData = (d?.subjects ?? []).map((s) => ({ subject: s.subjectName, 현재: s.currentScore, 목표: s.targetScore }));
  const trendData = (d?.student?.recentExams ?? []).map((e) => ({ name: e.name?.slice(0, 4) ?? "", 점수: e.totalScore ?? e.raw_score ?? 0 }));

  // ── 진단 요약 탭 ──
  const diagTab = <div className="page-grid" style={{ marginTop: 14 }}>
    <section className="stats-grid">
      <StatCard icon={Brain} label="주요 진단" value={d?.diagnosis?.primaryWeaknessType ? <WeaknessBadge typeId={d.diagnosis.primaryWeaknessType} /> : "-"} description="가장 먼저 확인할 유형" color="#7C3AED" />
      <StatCard icon={Target} label="목표 대학 격차" value={formatScore(d?.targetGap?.gap)} description="환산 점수 기준" color="#EF4444" />
      <StatCard icon={Calendar} label="최근 시험" value={latestExam} description="가장 최근 반영" color="#10B981" />
    </section>

    {d?.strategy?.studentSummary && <section className="hero-card" style={{ border: "1px solid rgba(124,58,237,0.18)", background: "linear-gradient(135deg, rgba(124,58,237,0.05), rgba(255,255,255,0.45))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><AIBadge /><span style={{ fontSize: 15, fontWeight: 700 }}>학습 전략 요약</span></div>
      <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.75 }}>{d.strategy.studentSummary}</p>
      {d.strategy.instructorSummary && <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 4 }}>💬 강사용 상담 포인트</div>
        <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>{d.strategy.instructorSummary}</p>
        {(d.strategy.coachingPoints ?? []).map((p, i) => <div key={i} style={{ padding: "8px 12px", marginTop: 6, borderRadius: 10, background: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.4)", fontSize: 13, color: "#475569", display: "flex", gap: 8 }}><span style={{ width: 20, height: 20, borderRadius: 6, background: "#3B82F612", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>{p}</div>)}
      </div>}
    </section>}

    <section className="two-grid">
      {radarData.length > 0 && <section className="panel">
        <SectionHeader icon={Target} title="과목별 현재 vs 목표" />
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(0,0,0,0.06)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#475569" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94A3B8" }} />
            <Radar name="현재" dataKey="현재" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.15} strokeWidth={2} />
            <Radar name="목표" dataKey="목표" stroke="#EF4444" fill="#EF4444" fillOpacity={0.04} strokeWidth={2} strokeDasharray="5 5" />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </section>}

      <section className="panel">
        <SectionHeader icon={BarChart3} title="과목별 갭 분석" subtitle="대학 반영비중 고려" />
        {(d?.subjects ?? []).map((s, i) => <GapBar key={i} current={s.currentScore} target={s.targetScore} label={s.subjectName} color={SUBJECT_COLORS[s.subjectName] ?? "#3B82F6"} />)}
        {(d?.subjects ?? []).length === 0 && <StatusBox tone="empty" title="데이터 없음" description="시험 결과가 쌓이면 표시돼요." />}
      </section>
    </section>

    {trendData.length > 1 && <section className="panel">
      <SectionHeader icon={TrendingUp} title="점수 추이" />
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={trendData}>
          <defs><linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#94A3B8" }} /><Tooltip content={<GlassTooltip />} />
          <Area type="monotone" dataKey="점수" stroke="#7C3AED" fill="url(#gTrend)" strokeWidth={2.5} dot={{ r: 4, fill: "#7C3AED", strokeWidth: 2, stroke: "#fff" }} />
        </AreaChart>
      </ResponsiveContainer>
    </section>}

    <section className="panel">
      <SectionHeader icon={BookOpen} title="보완 필요 단원" />
      <div className="three-grid">{(d?.weakUnits ?? []).map((u, i) => <div key={i} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{toSubjectLabel(u.subjectCode)} · {u.unitName}</div><ProgressBar value={u.mastery} max={100} color={u.mastery < 50 ? "#EF4444" : "#F59E0B"} height={6} showLabel /></div>)}</div>
      {(d?.weakUnits ?? []).length === 0 && <StatusBox tone="empty" title="데이터 없음" description="계산되면 표시돼요." />}
    </section>
  </div>;

  // ── 결과 입력 탭 ──
  const resultTab = <div className="page-grid" style={{ marginTop: 14 }}>
    <section className="two-grid">
      <section className="panel">
        <div className="section-header"><h2>📝 시험 결과 입력</h2><button className="ghost-button" type="button" onClick={recalc} style={{ fontSize: 12, padding: "6px 12px" }}><RefreshCw size={12} style={{ marginRight: 4 }} />전략 재계산</button></div>
        <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>시험을 고르고 문항별 정오답을 체크하면 점수가 자동 계산돼요.</p>
        <form className="form-stack" onSubmit={saveResult}>
          <div className="form-grid">
            <label className="field"><span>시험</span><select value={rf.exam_id} onChange={(e) => setRf((p) => ({ ...p, exam_id: e.target.value }))}><option value="">선택</option>{(exams.data?.exams ?? []).map((e) => <option key={e.id} value={String(e.id).replace(/^e/, "")}>{e.name}</option>)}</select></label>
            <label className="field"><span>자동 계산 점수</span><input type="number" value={calcScore} readOnly /></label>
            <label className="field"><span>백분위</span><input type="number" value={rf.percentile} onChange={(e) => setRf((p) => ({ ...p, percentile: e.target.value }))} placeholder="선택" /></label>
            <label className="field"><span>등급</span><input type="number" value={rf.grade} onChange={(e) => setRf((p) => ({ ...p, grade: e.target.value }))} placeholder="선택" /></label>
          </div>
          {questions.loading && <LoadingPanel title="문항 불러오는 중" />}
          {(questions.data ?? []).length > 0 && <div className="question-grid">{questions.data.map((q) => { const cur = qr[q.id] ?? { is_correct: false }; return <div className="question-card" key={q.id}><div className="question-card-header"><strong>{q.number}번</strong><span className="muted" style={{ fontSize: 11 }}>{q.points}점 · 난도{q.difficulty}</span></div><div style={{ display: "flex", gap: 6 }}><button type="button" className={`nav-button ${cur.is_correct ? "active" : ""}`} onClick={() => setQr((p) => ({ ...p, [q.id]: { is_correct: true, points: q.points } }))} style={{ flex: 1, fontSize: 12, padding: "7px" }}>✓ 정답</button><button type="button" className={`nav-button ${!cur.is_correct ? "active" : ""}`} onClick={() => setQr((p) => ({ ...p, [q.id]: { is_correct: false, points: q.points } }))} style={{ flex: 1, fontSize: 12, padding: "7px" }}>✗ 오답</button></div></div>; })}</div>}
          {rf.exam_id && !(questions.data ?? []).length && !questions.loading && <StatusBox tone="empty" title="문항 없음" description="시험 관리에서 문항을 등록해주세요." />}
          <button className="primary-button" type="submit" disabled={!rf.exam_id}>결과 저장</button>
        </form>
        {msg && <StatusBox tone={msg.includes("실패") ? "error" : "info"} title="저장 결과" description={msg} />}
        {rmsg && <StatusBox tone={rmsg.includes("실패") ? "error" : "info"} title="재계산" description={rmsg} />}
      </section>

      <section className="table-card">
        <h2>저장된 시험 결과</h2>
        {results.loading && <LoadingPanel title="불러오는 중" />}
        {(results.data ?? []).length === 0 && !results.loading ? <StatusBox tone="empty" title="결과 없음" description="결과를 입력하면 표시돼요." /> : <table><thead><tr><th>시험</th><th>과목</th><th>원점수</th><th>백분위</th><th>등급</th></tr></thead><tbody>{(results.data ?? []).map((r) => <tr key={r.id}><td>{r.exam_name}</td><td>{r.subject_name}</td><td><strong>{formatScore(r.raw_score)}</strong></td><td>{formatPercent(r.percentile)}</td><td>{r.grade ?? "-"}</td></tr>)}</tbody></table>}
      </section>
    </section>
  </div>;

  return <div className="page-grid">
    <section className="hero-card">
      <button className="ghost-button" type="button" onClick={() => navigate(backPath)} style={{ marginBottom: 12, fontSize: 13 }}><ArrowLeft size={14} style={{ marginRight: 4 }} />학생 목록</button>
      <h1>{d?.student?.name ?? "학생"} 학생 상세</h1>
      <p className="muted" style={{ fontSize: 15 }}>{d ? `${d.targetGap?.university_name ?? ""} 기준 격차 ${formatScore(d.targetGap?.gap)}` : "분석 중..."}</p>
      {detail.loading && <LoadingPanel title="불러오는 중" description="진단과 전략을 정리하고 있어요." />}
      {detail.error && <StatusBox tone="error" title="실패" description={detail.error} />}
    </section>
    {!detail.loading && !detail.error && <Tabs defaultTab="diagnosis" tabs={[{ key: "diagnosis", label: "진단 요약", content: diagTab }, { key: "result", label: "결과 입력", badge: (results.data ?? []).length || undefined, content: resultTab }]} />}
  </div>;
}

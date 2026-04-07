import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAppState } from "../contexts/AppStateContext.jsx";
import { apiClient } from "../lib/apiClient.js";
import { formatPercent, formatScore, toSubjectLabel, toWeaknessLabel } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { ListCard } from "../components/common/ListCard.jsx";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { StatCard } from "../components/common/StatCard.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";

function createEmptyResultForm() {
  return {
    exam_id: "",
    raw_score: "",
    percentile: "",
    grade: "",
    completed_in_seconds: "",
  };
}

export function StudentDetailPage({ studentId }) {
  const { session } = useAuth();
  const { openPage } = useAppState();
  const [resultForm, setResultForm] = useState(createEmptyResultForm());
  const [questionResults, setQuestionResults] = useState({});
  const [resultMessage, setResultMessage] = useState("");
  const [recalculateMessage, setRecalculateMessage] = useState("");

  const detailState = useAsyncData(() => apiClient.getStudentDetail(session.accessToken, studentId), [session.accessToken, studentId]);
  const resultsState = useAsyncData(
    () => apiClient.getStudentResults(session.accessToken, Number(String(studentId).replace(/^st/, ""))),
    [session.accessToken, studentId],
  );
  const examsState = useAsyncData(() => apiClient.getExams(session.accessToken), [session.accessToken]);
  const questionState = useAsyncData(
    () => (resultForm.exam_id ? apiClient.getExamQuestions(session.accessToken, Number(resultForm.exam_id)) : Promise.resolve([])),
    [session.accessToken, resultForm.exam_id],
  );

  const numericStudentId = Number(String(studentId).replace(/^st/, ""));
  const selectedSavedResult = useMemo(
    () => (resultsState.data ?? []).find((result) => String(result.exam_id) === String(resultForm.exam_id)),
    [resultsState.data, resultForm.exam_id],
  );

  useEffect(() => {
    if (!selectedSavedResult) {
      setResultForm((previous) => ({
        ...previous,
        percentile: "",
        grade: "",
        completed_in_seconds: "",
      }));
      return;
    }

    setResultForm((previous) => ({
      ...previous,
      raw_score: String(selectedSavedResult.raw_score ?? ""),
      percentile: selectedSavedResult.percentile != null ? String(selectedSavedResult.percentile) : "",
      grade: selectedSavedResult.grade != null ? String(selectedSavedResult.grade) : "",
      completed_in_seconds:
        selectedSavedResult.completed_in_seconds != null ? String(selectedSavedResult.completed_in_seconds) : "",
    }));
  }, [selectedSavedResult]);

  useEffect(() => {
    const questions = questionState.data ?? [];
    if (!questions.length) {
      setQuestionResults({});
      return;
    }

    const savedBreakdown = selectedSavedResult?.question_breakdown ?? {};
    setQuestionResults(
      Object.fromEntries(
        questions.map((question) => {
          const saved = savedBreakdown[String(question.id)] ?? {};
          return [
            question.id,
            {
              is_correct: Boolean(saved.is_correct),
              points: question.points,
              estimated_seconds: saved.estimated_seconds ?? question.estimated_seconds,
            },
          ];
        }),
      ),
    );
  }, [questionState.data, selectedSavedResult]);

  const latestExamLabel = useMemo(() => {
    const recent = detailState.data?.student?.recentExams ?? [];
    return recent.length ? recent[recent.length - 1].name : "-";
  }, [detailState.data]);

  const calculatedRawScore = useMemo(() => {
    const questions = questionState.data ?? [];
    if (!questions.length) return Number(resultForm.raw_score || 0);
    return questions.reduce(
      (total, question) => total + (questionResults[question.id]?.is_correct ? Number(question.points) : 0),
      0,
    );
  }, [questionResults, questionState.data, resultForm.raw_score]);

  async function handleSaveResult(event) {
    event.preventDefault();
    setResultMessage("");
    try {
      await apiClient.saveStudentResult(session.accessToken, {
        student_profile_id: numericStudentId,
        exam_id: Number(resultForm.exam_id),
        raw_score: calculatedRawScore,
        percentile: resultForm.percentile ? Number(resultForm.percentile) : null,
        grade: resultForm.grade ? Number(resultForm.grade) : null,
        completed_in_seconds: resultForm.completed_in_seconds ? Number(resultForm.completed_in_seconds) : null,
        question_breakdown: Object.fromEntries(
          Object.entries(questionResults).map(([questionId, payload]) => [String(questionId), payload]),
        ),
        result_metadata: {
          source: "frontend_manual",
          question_count: questionState.data?.length ?? 0,
        },
      });
      setResultMessage("학생 결과를 저장했고 최신 전략도 다시 계산했어.");
      resultsState.reload();
      detailState.reload();
    } catch (submitError) {
      setResultMessage(submitError instanceof Error ? submitError.message : "학생 결과 저장에 실패했어.");
    }
  }

  async function handleRecalculate() {
    setRecalculateMessage("");
    try {
      await apiClient.recalculateStudent(session.accessToken, numericStudentId);
      setRecalculateMessage("진단과 학습 전략을 다시 계산했어.");
      detailState.reload();
    } catch (submitError) {
      setRecalculateMessage(submitError instanceof Error ? submitError.message : "재계산에 실패했어.");
    }
  }

  const resultSubmitEnabled = resultForm.exam_id && (questionState.data?.length ? true : resultForm.raw_score !== "");

  return (
    <div className="page-grid">
      <section className="hero-card">
        <button className="ghost-button" type="button" onClick={() => openPage("students")} style={{ marginBottom: 12 }}>
          학생 목록으로 돌아가기
        </button>
        <h1>{detailState.data?.student?.name ?? "학생"} 상세</h1>
        <p className="muted">
          {detailState.data
            ? `${detailState.data.targetGap.university_name ?? "목표 대학"} 기준 격차는 ${formatScore(detailState.data.targetGap.gap)}점이야.`
            : "학생 상세 정보를 불러오고 있어."}
        </p>
        {detailState.loading ? <LoadingPanel title="학생 상세를 불러오는 중" description="진단과 전략을 함께 정리하고 있어." /> : null}
        {detailState.error ? <StatusBox tone="error" title="학생 정보를 불러오지 못했어" description={detailState.error} /> : null}
      </section>

      <section className="stats-grid">
        <StatCard
          label="주요 진단"
          value={detailState.data?.diagnosis?.primaryWeaknessType ? toWeaknessLabel(detailState.data.diagnosis.primaryWeaknessType) : "-"}
          description="지금 가장 먼저 확인할 취약 유형"
        />
        <StatCard
          label="목표 대학 격차"
          value={formatScore(detailState.data?.targetGap?.gap)}
          description="목표 대학 환산 점수 기준 차이"
        />
        <StatCard
          label="최근 확인 시험"
          value={latestExamLabel}
          description="가장 최근에 반영된 시험"
        />
      </section>

      <section className="two-grid">
        <ListCard
          title="한눈에 보는 전략"
          items={
            detailState.data?.strategy?.studentSummary
              ? [detailState.data.strategy.studentSummary]
              : detailState.data?.strategy?.summary
                ? [detailState.data.strategy.summary]
                : []
          }
        />
        <ListCard
          title="강사용 상담 포인트"
          items={
            detailState.data?.strategy?.instructorSummary
              ? [detailState.data.strategy.instructorSummary, ...(detailState.data?.strategy?.coachingPoints ?? [])]
              : detailState.data?.strategy?.coachingPoints ?? []
          }
        />
      </section>

      <section className="two-grid">
        <ListCard
          title="과목별 현재 위치"
          items={(detailState.data?.subjects ?? []).map(
            (subject) => `${subject.subjectName} · 현재 ${formatScore(subject.currentScore)} · 목표 ${formatScore(subject.targetScore)}`,
          )}
        />
        <ListCard
          title="보완이 필요한 단원"
          items={(detailState.data?.weakUnits ?? []).map(
            (unit) => `${toSubjectLabel(unit.subjectCode)} · ${unit.unitName} · 이해도 ${formatPercent(unit.mastery)}`,
          )}
        />
      </section>

      <section className="two-grid">
        <section className="panel">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>학생 결과 입력</h2>
            <button className="ghost-button" type="button" onClick={handleRecalculate}>전략 다시 계산</button>
          </div>
          <p className="muted">시험을 고르면 기존 저장값을 먼저 불러오고, 문항별 정오답을 체크하면 점수가 자동으로 계산돼.</p>
          <form className="form-stack" onSubmit={handleSaveResult}>
            <div className="form-grid">
              <label className="field">
                <span>시험</span>
                <select value={resultForm.exam_id} onChange={(event) => setResultForm((prev) => ({ ...prev, exam_id: event.target.value }))}>
                  <option value="">시험 선택</option>
                  {(examsState.data?.exams ?? []).map((exam) => (
                    <option key={exam.id} value={String(exam.id).replace(/^e/, "")}>
                      {exam.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>자동 계산 점수</span>
                <input type="number" value={calculatedRawScore} readOnly />
              </label>
              <label className="field">
                <span>백분위</span>
                <input type="number" value={resultForm.percentile} onChange={(event) => setResultForm((prev) => ({ ...prev, percentile: event.target.value }))} />
              </label>
              <label className="field">
                <span>등급</span>
                <input type="number" value={resultForm.grade} onChange={(event) => setResultForm((prev) => ({ ...prev, grade: event.target.value }))} />
              </label>
              <label className="field">
                <span>풀이 시간(초)</span>
                <input
                  type="number"
                  value={resultForm.completed_in_seconds}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, completed_in_seconds: event.target.value }))}
                />
              </label>
            </div>

            {questionState.loading ? <LoadingPanel title="문항 정보를 불러오는 중" description="시험별 문항을 정리하고 있어." /> : null}
            {questionState.error ? <StatusBox tone="error" title="문항 정보를 불러오지 못했어" description={questionState.error} /> : null}

            {questionState.data?.length ? (
              <div className="question-grid">
                {questionState.data.map((question) => {
                  const current = questionResults[question.id] ?? { is_correct: false };
                  return (
                    <div className="question-card" key={question.id}>
                      <div className="question-card-header">
                        <strong>{question.number}번 문항</strong>
                        <span className="muted">{question.question_type}</span>
                      </div>
                      <div className="question-card-meta">
                        <span>배점 {formatScore(question.points)}</span>
                        <span>난도 {question.difficulty}</span>
                        <span>예상 시간 {question.estimated_seconds}초</span>
                      </div>
                      <div className="toolbar">
                        <button
                          className={`nav-button ${current.is_correct ? "active" : ""}`}
                          type="button"
                          onClick={() =>
                            setQuestionResults((previous) => ({
                              ...previous,
                              [question.id]: {
                                is_correct: true,
                                points: question.points,
                                estimated_seconds: question.estimated_seconds,
                              },
                            }))
                          }
                        >
                          정답
                        </button>
                        <button
                          className={`nav-button ${current.is_correct === false ? "active" : ""}`}
                          type="button"
                          onClick={() =>
                            setQuestionResults((previous) => ({
                              ...previous,
                              [question.id]: {
                                is_correct: false,
                                points: question.points,
                                estimated_seconds: question.estimated_seconds,
                              },
                            }))
                          }
                        >
                          오답
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : resultForm.exam_id ? (
              <StatusBox tone="empty" title="문항이 아직 없어" description="이 시험에는 아직 등록된 문항이 없어. 시험 관리에서 먼저 문항을 등록해 줘." />
            ) : null}

            <button className="primary-button" type="submit" disabled={!resultSubmitEnabled}>학생 결과 저장</button>
          </form>
          {resultMessage ? <StatusBox tone={resultMessage.includes("실패") ? "error" : "info"} title="결과 입력 상태" description={resultMessage} /> : null}
          {recalculateMessage ? <StatusBox tone={recalculateMessage.includes("실패") ? "error" : "info"} title="재계산 상태" description={recalculateMessage} /> : null}
        </section>

        <section className="table-card">
          <h2>저장된 시험 결과</h2>
          {resultsState.loading ? <LoadingPanel title="시험 결과를 불러오는 중" /> : null}
          {resultsState.error ? <StatusBox tone="error" title="시험 결과를 불러오지 못했어" description={resultsState.error} /> : null}
          <table>
            <thead>
              <tr>
                <th>시험</th>
                <th>과목</th>
                <th>원점수</th>
                <th>백분위</th>
                <th>등급</th>
              </tr>
            </thead>
            <tbody>
              {(resultsState.data ?? []).map((result) => (
                <tr key={result.id}>
                  <td>{result.exam_name}</td>
                  <td>{result.subject_name}</td>
                  <td>{formatScore(result.raw_score)}</td>
                  <td>{formatPercent(result.percentile)}</td>
                  <td>{result.grade ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </div>
  );
}

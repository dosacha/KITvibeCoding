import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { apiClient } from "../lib/apiClient.js";
import { formatDate, formatScore } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";

function createEmptyQuestionForm(examId = "") {
  return {
    exam_id: examId,
    number: "",
    difficulty: 3,
    points: 4,
    question_type: "객관식",
    estimated_seconds: 90,
    unit_id: "",
    weight: 1,
  };
}

export function ExamManagementPage() {
  const { session } = useAuth();
  const [examForm, setExamForm] = useState({
    academy_id: 1,
    subject_id: 1,
    name: "",
    exam_date: "",
    total_score: 100,
  });
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examMessage, setExamMessage] = useState("");
  const [questionMessage, setQuestionMessage] = useState("");
  const [editingExam, setEditingExam] = useState(false);
  const [questionForm, setQuestionForm] = useState(createEmptyQuestionForm());

  const examsState = useAsyncData(() => apiClient.getExams(session.accessToken), [session.accessToken]);
  const examCatalogState = useAsyncData(() => apiClient.getExamCatalog(session.accessToken), [session.accessToken]);
  const metadataState = useAsyncData(() => apiClient.getMetadata(session.accessToken), [session.accessToken]);
  const unitsState = useAsyncData(
    () => (examForm.subject_id ? apiClient.getSubjectUnits(session.accessToken, Number(examForm.subject_id)) : Promise.resolve([])),
    [session.accessToken, examForm.subject_id],
  );
  const questionsState = useAsyncData(
    () => (selectedExamId ? apiClient.getExamQuestions(session.accessToken, Number(selectedExamId)) : Promise.resolve([])),
    [session.accessToken, selectedExamId],
  );

  const exams = examsState.data?.exams ?? [];
  const examCatalog = examCatalogState.data ?? [];
  const selectedExamRecord = useMemo(
    () => examCatalog.find((exam) => String(exam.id) === String(selectedExamId)),
    [examCatalog, selectedExamId],
  );

  useEffect(() => {
    if (!selectedExamId && exams.length > 0) {
      const firstExamId = String(exams[0].id).replace(/^e/, "");
      setSelectedExamId(firstExamId);
      setQuestionForm(createEmptyQuestionForm(firstExamId));
    }
  }, [exams, selectedExamId]);

  function syncExamFormWithSelectedExam() {
    if (!selectedExamRecord) return;
    setExamForm({
      academy_id: selectedExamRecord.academy_id,
      subject_id: selectedExamRecord.subject_id,
      name: selectedExamRecord.name,
      exam_date: selectedExamRecord.exam_date,
      total_score: selectedExamRecord.total_score,
    });
  }

  async function handleCreateExam(event) {
    event.preventDefault();
    setExamMessage("");
    try {
      await apiClient.createExam(session.accessToken, {
        academy_id: Number(examForm.academy_id),
        subject_id: Number(examForm.subject_id),
        name: examForm.name.trim(),
        exam_date: examForm.exam_date,
        total_score: Number(examForm.total_score),
      });
      setExamMessage("시험을 등록했어.");
      setExamForm((previous) => ({ ...previous, name: "", exam_date: "", total_score: 100 }));
      examsState.reload();
      examCatalogState.reload();
    } catch (submitError) {
      setExamMessage(submitError instanceof Error ? submitError.message : "시험 등록에 실패했어.");
    }
  }

  async function handleUpdateExam() {
    if (!selectedExamId) return;
    setExamMessage("");
    try {
      await apiClient.updateExam(session.accessToken, Number(selectedExamId), {
        name: examForm.name.trim(),
        exam_date: examForm.exam_date,
        total_score: Number(examForm.total_score),
      });
      setExamMessage("선택한 시험 정보를 수정했어.");
      setEditingExam(false);
      examsState.reload();
      examCatalogState.reload();
    } catch (submitError) {
      setExamMessage(submitError instanceof Error ? submitError.message : "시험 수정에 실패했어.");
    }
  }

  async function handleCreateQuestion(event) {
    event.preventDefault();
    setQuestionMessage("");
    try {
      await apiClient.createQuestion(session.accessToken, {
        exam_id: Number(questionForm.exam_id),
        number: Number(questionForm.number),
        difficulty: Number(questionForm.difficulty),
        points: Number(questionForm.points),
        question_type: questionForm.question_type,
        estimated_seconds: Number(questionForm.estimated_seconds),
        unit_mappings: questionForm.unit_id
          ? [{ unit_id: Number(questionForm.unit_id), weight: Number(questionForm.weight) }]
          : [],
      });
      setQuestionMessage("문항을 등록했어.");
      setQuestionForm(createEmptyQuestionForm(selectedExamId));
      questionsState.reload();
      examsState.reload();
      examCatalogState.reload();
    } catch (submitError) {
      setQuestionMessage(submitError instanceof Error ? submitError.message : "문항 등록에 실패했어.");
    }
  }

  const availableUnits = unitsState.data ?? [];
  const canSubmitExam = examForm.name.trim() && examForm.exam_date && Number(examForm.total_score) > 0;
  const canSubmitQuestion = selectedExamId && questionForm.number && questionForm.points && questionForm.question_type;

  return (
    <div className="page-grid">
      <section className="hero-card">
        <h1>시험 관리</h1>
        <p className="muted">시험 등록, 수정, 문항 등록을 한 화면에서 이어서 처리할 수 있어.</p>
        {examsState.loading || metadataState.loading || examCatalogState.loading ? (
          <LoadingPanel title="시험 정보를 불러오는 중" description="시험과 기본 설정을 정리하고 있어." />
        ) : null}
        {examsState.error ? <StatusBox tone="error" title="시험 목록 오류" description={examsState.error} /> : null}
        {metadataState.error ? <StatusBox tone="error" title="기본 정보 오류" description={metadataState.error} /> : null}
        {examCatalogState.error ? <StatusBox tone="error" title="시험 원본 정보 오류" description={examCatalogState.error} /> : null}
      </section>

      <section className="two-grid">
        <section className="panel">
          <h2>새 시험 등록</h2>
          <form className="form-stack" onSubmit={handleCreateExam}>
            <div className="form-grid">
              <label className="field">
                <span>학원</span>
                <select value={examForm.academy_id} onChange={(event) => setExamForm((prev) => ({ ...prev, academy_id: Number(event.target.value) }))}>
                  {(metadataState.data?.academies ?? []).map((academy) => (
                    <option key={academy.id} value={academy.id}>{academy.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>과목</span>
                <select
                  value={examForm.subject_id}
                  onChange={(event) => {
                    const subjectId = Number(event.target.value);
                    setExamForm((prev) => ({ ...prev, subject_id: subjectId }));
                    setQuestionForm((prev) => ({ ...prev, unit_id: "" }));
                  }}
                >
                  {(metadataState.data?.subjects ?? []).map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>시험 이름</span>
                <input value={examForm.name} onChange={(event) => setExamForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>시험일</span>
                <input type="date" value={examForm.exam_date} onChange={(event) => setExamForm((prev) => ({ ...prev, exam_date: event.target.value }))} />
              </label>
              <label className="field">
                <span>총점</span>
                <input type="number" value={examForm.total_score} onChange={(event) => setExamForm((prev) => ({ ...prev, total_score: Number(event.target.value) }))} />
              </label>
            </div>
            <button className="primary-button" type="submit" disabled={!canSubmitExam}>시험 등록</button>
          </form>
          {examMessage ? <StatusBox tone={examMessage.includes("실패") ? "error" : "info"} title="시험 작업 결과" description={examMessage} /> : null}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>선택한 시험 수정</h2>
            <select
              value={selectedExamId}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedExamId(nextId);
                setQuestionForm(createEmptyQuestionForm(nextId));
              }}
            >
              {exams.map((exam) => (
                <option key={exam.id} value={String(exam.id).replace(/^e/, "")}>
                  {exam.name}
                </option>
              ))}
            </select>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                syncExamFormWithSelectedExam();
                setEditingExam(true);
              }}
            >
              값 불러오기
            </button>
          </div>
          {selectedExamRecord ? (
            <>
              <div className="status-box info">
                <strong>{selectedExamRecord.name}</strong>
                <div>{formatDate(selectedExamRecord.exam_date)} · 총점 {formatScore(selectedExamRecord.total_score)}</div>
              </div>
              {editingExam ? (
                <div className="form-stack">
                  <div className="form-grid">
                    <label className="field">
                      <span>시험 이름</span>
                      <input value={examForm.name} onChange={(event) => setExamForm((prev) => ({ ...prev, name: event.target.value }))} />
                    </label>
                    <label className="field">
                      <span>시험일</span>
                      <input type="date" value={examForm.exam_date} onChange={(event) => setExamForm((prev) => ({ ...prev, exam_date: event.target.value }))} />
                    </label>
                    <label className="field">
                      <span>총점</span>
                      <input type="number" value={examForm.total_score} onChange={(event) => setExamForm((prev) => ({ ...prev, total_score: Number(event.target.value) }))} />
                    </label>
                  </div>
                  <div className="toolbar">
                    <button className="primary-button" type="button" onClick={handleUpdateExam}>시험 수정</button>
                    <button className="ghost-button" type="button" onClick={() => setEditingExam(false)}>닫기</button>
                  </div>
                </div>
              ) : (
                <p className="muted">시험 이름, 시험일, 총점을 수정할 수 있어.</p>
              )}
            </>
          ) : (
            <StatusBox tone="empty" title="선택한 시험이 없어" description="먼저 시험을 등록하거나 목록에서 시험을 골라 줘." />
          )}
        </section>
      </section>

      <section className="two-grid">
        <section className="panel">
          <h2>문항 등록</h2>
          <form className="form-stack" onSubmit={handleCreateQuestion}>
            <div className="form-grid">
              <label className="field">
                <span>문항 번호</span>
                <input type="number" value={questionForm.number} onChange={(event) => setQuestionForm((prev) => ({ ...prev, number: event.target.value }))} />
              </label>
              <label className="field">
                <span>난도</span>
                <select value={questionForm.difficulty} onChange={(event) => setQuestionForm((prev) => ({ ...prev, difficulty: Number(event.target.value) }))}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>배점</span>
                <input type="number" value={questionForm.points} onChange={(event) => setQuestionForm((prev) => ({ ...prev, points: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>문항 유형</span>
                <input value={questionForm.question_type} onChange={(event) => setQuestionForm((prev) => ({ ...prev, question_type: event.target.value }))} />
              </label>
              <label className="field">
                <span>예상 풀이 시간(초)</span>
                <input type="number" value={questionForm.estimated_seconds} onChange={(event) => setQuestionForm((prev) => ({ ...prev, estimated_seconds: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>연결 단원</span>
                <select value={questionForm.unit_id} onChange={(event) => setQuestionForm((prev) => ({ ...prev, unit_id: event.target.value }))}>
                  <option value="">선택 안 함</option>
                  {availableUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="primary-button" type="submit" disabled={!canSubmitQuestion}>문항 등록</button>
          </form>
          {questionMessage ? <StatusBox tone={questionMessage.includes("실패") ? "error" : "info"} title="문항 작업 결과" description={questionMessage} /> : null}
          {unitsState.error ? <StatusBox tone="error" title="단원 목록 오류" description={unitsState.error} /> : null}
        </section>

        <section className="table-card">
          <h2>등록된 문항</h2>
          {questionsState.loading ? <LoadingPanel title="문항을 불러오는 중" /> : null}
          {questionsState.error ? <StatusBox tone="error" title="문항 목록 오류" description={questionsState.error} /> : null}
          <table>
            <thead>
              <tr>
                <th>번호</th>
                <th>유형</th>
                <th>난도</th>
                <th>배점</th>
                <th>연결 단원</th>
              </tr>
            </thead>
            <tbody>
              {(questionsState.data ?? []).map((question) => (
                <tr key={question.id}>
                  <td>{question.number}</td>
                  <td>{question.question_type}</td>
                  <td>{question.difficulty}</td>
                  <td>{formatScore(question.points)}</td>
                  <td>{question.unit_mappings?.map((mapping) => mapping.unit_id).join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>

      <section className="table-card">
        <h2>시험 목록</h2>
        <table>
          <thead>
            <tr>
              <th>시험 이름</th>
              <th>시험일</th>
              <th>과목</th>
              <th>문항 수</th>
              <th>응시 인원</th>
              <th>평균 점수</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.id}>
                <td>{exam.name}</td>
                <td>{formatDate(exam.date)}</td>
                <td>{exam.subject}</td>
                <td>{exam.questionCount}</td>
                <td>{exam.participantCount}</td>
                <td>{formatScore(exam.avgScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

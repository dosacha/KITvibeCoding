import { useEffect, useMemo, useState } from 'react';
import CsvUploadPanel from '../components/CsvUploadPanel.jsx';
import Layout from '../components/Layout.jsx';
import QuestionEditor from '../components/QuestionEditor.jsx';
import ResultEntryTable from '../components/ResultEntryTable.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiBaseUrl, apiRequest } from '../lib/api.js';

// 시험 운영 페이지.
// - 좌측: 등록된 시험 목록 + "새 시험" 버튼
// - 우측: 선택한 시험의 4-탭 운영 화면 (기본정보 / 문항 관리 / 결과 입력 / CSV 업로드)
// 새 시험 모드일 때는 우측이 시험 생성 폼으로 바뀐다.
//
// 데이터:
//   - GET /frontend/exams                   → 좌측 목록
//   - GET /frontend/metadata                → 과목 / 단원 / 반
//   - GET /frontend/exams/{id}              → 우측 탭 전체 (slice 1 backend)
// 변경:
//   - POST /exams                           → 시험 생성
//   - PUT  /exams/{id}                      → 시험 수정
//   - POST /questions                       → 문항 생성
//   - PUT  /questions/{id}                  → 문항 수정
//   - POST /student-results                 → 결과 1건 저장
//   - POST /student-results/upload-csv      → CSV 업로드 (CsvUploadPanel 내부)

const TABS = [
  { id: 'overview', label: '기본정보' },
  { id: 'questions', label: '문항 관리' },
  { id: 'results', label: '결과 입력' },
  { id: 'csv', label: 'CSV 업로드' },
];

const NEW_EXAM = 'new';

const blankExamForm = (subjectId = '', classGroupId = '') => ({
  subject_id: subjectId,
  class_group_id: classGroupId,
  name: '',
  exam_date: '',
  total_score: 100,
  time_limit_minutes: 60,
  is_retake: false,
});

export default function ExamsPage() {
  const { token, user } = useAuth();
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [pageMessage, setPageMessage] = useState('');
  const [pageError, setPageError] = useState('');

  // 시험 목록 + 메타데이터.
  const {
    data: indexData,
    loading: indexLoading,
    error: indexError,
    reload: reloadIndex,
  } = useAsyncData(
    async () => {
      const [exams, metadata] = await Promise.all([
        apiRequest('/frontend/exams', { token }),
        apiRequest('/frontend/metadata', { token }),
      ]);
      return { exams, metadata };
    },
    [token]
  );

  // 선택한 시험 상세.
  const detailKey = selectedExamId && selectedExamId !== NEW_EXAM ? selectedExamId : null;
  const {
    data: detailData,
    loading: detailLoading,
    error: detailError,
    reload: reloadDetail,
  } = useAsyncData(
    async () => {
      if (!detailKey) return null;
      return apiRequest(`/frontend/exams/${detailKey}`, { token });
    },
    [token, detailKey]
  );

  // 첫 진입 시 첫 시험 자동 선택.
  useEffect(() => {
    if (!indexData?.exams?.length) return;
    if (selectedExamId === null) {
      setSelectedExamId(indexData.exams[0].id);
    }
  }, [indexData, selectedExamId]);

  const showFlash = (msg) => {
    setPageMessage(msg);
    setPageError('');
  };
  const showError = (msg) => {
    setPageError(msg);
    setPageMessage('');
  };

  // ----- 시험 생성 / 수정 -----------------------------------------------------

  const [examForm, setExamForm] = useState(blankExamForm());
  const [examFormSaving, setExamFormSaving] = useState(false);

  // detailData 가 바뀌면 기본정보 폼을 그 값으로 채운다.
  useEffect(() => {
    if (selectedExamId === NEW_EXAM) {
      const firstSubject = indexData?.metadata?.subjects?.[0]?.id || '';
      const firstClass = indexData?.metadata?.class_groups?.[0]?.id || '';
      setExamForm(blankExamForm(firstSubject, firstClass));
      setActiveTab('overview');
      return;
    }
    if (detailData?.exam) {
      setExamForm({
        subject_id: detailData.exam.subject_id,
        class_group_id: detailData.exam.class_group_id || '',
        name: detailData.exam.name,
        exam_date: detailData.exam.exam_date,
        total_score: detailData.exam.total_score,
        time_limit_minutes: detailData.exam.time_limit_minutes,
        is_retake: detailData.exam.is_retake,
      });
    }
  }, [detailData, selectedExamId, indexData]);

  const submitExamForm = async (event) => {
    event.preventDefault();
    setExamFormSaving(true);
    try {
      if (selectedExamId === NEW_EXAM) {
        const created = await apiRequest('/exams', {
          method: 'POST',
          token,
          body: {
            academy_id: user.academy_id,
            subject_id: Number(examForm.subject_id),
            class_group_id: examForm.class_group_id ? Number(examForm.class_group_id) : null,
            name: examForm.name,
            exam_date: examForm.exam_date,
            total_score: Number(examForm.total_score),
            time_limit_minutes: Number(examForm.time_limit_minutes),
            is_retake: Boolean(examForm.is_retake),
          },
        });
        showFlash('시험이 생성되었습니다. 문항 관리 탭에서 문항을 추가해 보세요.');
        await reloadIndex();
        setSelectedExamId(created.id);
        setActiveTab('questions');
      } else {
        await apiRequest(`/exams/${selectedExamId}`, {
          method: 'PUT',
          token,
          body: {
            subject_id: Number(examForm.subject_id),
            class_group_id: examForm.class_group_id ? Number(examForm.class_group_id) : null,
            name: examForm.name,
            exam_date: examForm.exam_date,
            total_score: Number(examForm.total_score),
            time_limit_minutes: Number(examForm.time_limit_minutes),
            is_retake: Boolean(examForm.is_retake),
          },
        });
        showFlash('시험 정보를 저장했습니다.');
        await Promise.all([reloadIndex(), reloadDetail()]);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '시험 저장에 실패했습니다.');
    } finally {
      setExamFormSaving(false);
    }
  };

  // ----- 문항 관리 -----------------------------------------------------------

  const [questionEditingId, setQuestionEditingId] = useState(null); // number id, 'new', or null
  const [questionSaving, setQuestionSaving] = useState(false);

  const handleQuestionSave = async (payload) => {
    if (!detailData?.exam) return;
    setQuestionSaving(true);
    try {
      if (questionEditingId === 'new') {
        await apiRequest('/questions', {
          method: 'POST',
          token,
          body: { exam_id: detailData.exam.id, ...payload },
        });
        showFlash('문항을 추가했습니다.');
      } else {
        await apiRequest(`/questions/${questionEditingId}`, {
          method: 'PUT',
          token,
          body: payload,
        });
        showFlash('문항을 수정했습니다.');
      }
      setQuestionEditingId(null);
      await Promise.all([reloadDetail(), reloadIndex()]);
    } catch (err) {
      // QuestionEditor 가 자체적으로 에러를 표시하도록 다시 throw.
      throw err;
    } finally {
      setQuestionSaving(false);
    }
  };

  // ----- 결과 입력 -----------------------------------------------------------

  const handleResultSave = async (payload) => {
    await apiRequest('/student-results', { method: 'POST', token, body: payload });
    await reloadDetail();
  };

  // ---------------------------------------------------------------------------

  const exams = indexData?.exams || [];
  const metadata = indexData?.metadata;
  const detail = detailData;
  const isNewExamMode = selectedExamId === NEW_EXAM;

  const editingQuestion = useMemo(() => {
    if (!detail || questionEditingId === null || questionEditingId === 'new') return null;
    return (detail.questions || []).find((question) => question.id === questionEditingId) || null;
  }, [detail, questionEditingId]);

  return (
    <Layout title="시험 운영" backTo="/instructor" backLabel="대시보드로 돌아가기">
      {indexLoading ? <div className="empty-state">시험 운영 데이터를 불러오는 중입니다...</div> : null}
      {indexError ? <div className="error-box">{indexError}</div> : null}
      {pageMessage ? <div className="info-box">{pageMessage}</div> : null}
      {pageError ? <div className="error-box">{pageError}</div> : null}

      {indexData ? (
        <div className="exams-layout">
          <aside className="exams-sidebar">
            <div className="exams-sidebar-header">
              <strong>등록된 시험</strong>
              <button
                type="button"
                className="compact"
                onClick={() => {
                  setSelectedExamId(NEW_EXAM);
                  setActiveTab('overview');
                }}
              >
                + 새 시험
              </button>
            </div>
            <ul className="exams-list">
              {exams.length === 0 ? <li className="muted small">등록된 시험이 없습니다.</li> : null}
              {exams.map((exam) => {
                const isActive = exam.id === selectedExamId;
                return (
                  <li key={exam.id}>
                    <button
                      type="button"
                      className={`exam-list-item${isActive ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setActiveTab('overview');
                      }}
                    >
                      <div>
                        <strong>{exam.name}</strong>
                        <div className="small muted">
                          {exam.subject_name} · {exam.class_group_name || '미지정'}
                        </div>
                      </div>
                      <div className="exam-list-meta">
                        <span className="small muted">{exam.exam_date}</span>
                        <span className="chip-item small">문항 {exam.question_count}</span>
                        {exam.is_retake ? <span className="chip-item small">재시험</span> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="exams-main">
            {isNewExamMode ? (
              <SectionCard title="새 시험 생성" subtitle="과목 / 반 / 시간 제한 / 재시험 여부까지 구조화해 저장합니다.">
                <ExamMetaForm
                  form={examForm}
                  setForm={setExamForm}
                  metadata={metadata}
                  isSaving={examFormSaving}
                  submitLabel="시험 생성"
                  onSubmit={submitExamForm}
                  onCancel={() => {
                    setSelectedExamId(exams[0]?.id || null);
                  }}
                />
              </SectionCard>
            ) : detail ? (
              <>
                <div className="exam-tabs-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{detail.exam.name}</h3>
                    <div className="muted small">
                      {detail.exam.subject_name} · {detail.exam.class_group_name || '반 미지정'} · 시행일 {detail.exam.exam_date} · 총점 {detail.exam.total_score}점 · {detail.exam.time_limit_minutes}분
                      {detail.exam.is_retake ? ' · 재시험' : ''}
                    </div>
                  </div>
                  <div className="exam-tabs-nav">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`secondary-button tab-button${activeTab === tab.id ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {detailLoading ? <div className="empty-state">시험 상세 데이터를 불러오는 중입니다...</div> : null}
                {detailError ? <div className="error-box">{detailError}</div> : null}

                {activeTab === 'overview' ? (
                  <SectionCard title="시험 기본 정보" subtitle="저장 시 변경 사항이 ChangeHistory 에 기록됩니다.">
                    <ExamMetaForm
                      form={examForm}
                      setForm={setExamForm}
                      metadata={metadata}
                      isSaving={examFormSaving}
                      submitLabel="시험 정보 저장"
                      onSubmit={submitExamForm}
                    />
                  </SectionCard>
                ) : null}

                {activeTab === 'questions' ? (
                  <SectionCard
                    title="문항 관리"
                    subtitle="문항별 정답키 / 배점 / 난이도 / 단원 매핑(가중치 다중) 을 구조화해 저장합니다."
                    actions={
                      questionEditingId === null ? (
                        <button type="button" onClick={() => setQuestionEditingId('new')}>
                          + 문항 추가
                        </button>
                      ) : null
                    }
                  >
                    {questionEditingId !== null ? (
                      <div className="subtle-card">
                        <h4>{questionEditingId === 'new' ? '새 문항' : `문항 #${editingQuestion?.number} 수정`}</h4>
                        <QuestionEditor
                          question={editingQuestion}
                          units={metadata?.units || []}
                          subjectId={detail.exam.subject_id}
                          isSaving={questionSaving}
                          onSave={handleQuestionSave}
                          onCancel={() => setQuestionEditingId(null)}
                        />
                      </div>
                    ) : null}

                    <div className="table-wrapper sticky-header">
                      <table className="dense-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>유형</th>
                            <th>스타일</th>
                            <th>난이도</th>
                            <th>배점</th>
                            <th>정답</th>
                            <th>예상 시간(초)</th>
                            <th>단원 매핑</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.questions || []).length === 0 ? (
                            <tr>
                              <td colSpan={9} className="muted small">
                                아직 등록된 문항이 없습니다. 우측 상단의 “문항 추가” 버튼을 누르세요.
                              </td>
                            </tr>
                          ) : null}
                          {(detail.questions || []).map((question) => (
                            <tr key={question.id}>
                              <td>{question.number}</td>
                              <td className="small">{question.question_type}</td>
                              <td className="small">{question.problem_style}</td>
                              <td>{question.teacher_difficulty}</td>
                              <td>{question.points}</td>
                              <td>{question.answer_key || '-'}</td>
                              <td>{question.estimated_seconds}</td>
                              <td>
                                {(question.unit_mappings || []).length === 0 ? (
                                  <span className="muted small">없음</span>
                                ) : (
                                  <ul className="mapping-summary">
                                    {question.unit_mappings.map((mapping) => (
                                      <li key={`${question.id}-${mapping.unit_id}`}>
                                        <span>{mapping.unit_name || `단원 #${mapping.unit_id}`}</span>
                                        <span className="chip-item small">w {mapping.weight}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="secondary-button compact"
                                  onClick={() => setQuestionEditingId(question.id)}
                                >
                                  수정
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                ) : null}

                {activeTab === 'results' ? (
                  <SectionCard
                    title="학생 결과 입력"
                    subtitle="학생별 결과 + 문항별 응답을 저장합니다. 저장 시 영향 재계산이 큐에 들어갑니다."
                  >
                    <ResultEntryTable
                      exam={detail.exam}
                      questions={detail.questions || []}
                      roster={detail.roster || []}
                      results={detail.results || []}
                      onSave={handleResultSave}
                    />
                  </SectionCard>
                ) : null}

                {activeTab === 'csv' ? (
                  <SectionCard
                    title="CSV 일괄 업로드"
                    subtitle="시험 한 건 단위로 학생 결과를 일괄 입력합니다."
                  >
                    <CsvUploadPanel
                      token={token}
                      exam={detail.exam}
                      apiBaseUrl={apiBaseUrl}
                      onUploaded={async () => {
                        await reloadDetail();
                        showFlash('CSV 업로드 결과가 반영되었습니다.');
                      }}
                    />
                  </SectionCard>
                ) : null}
              </>
            ) : (
              <SectionCard title="시험을 선택하세요" subtitle="좌측에서 시험을 선택하거나 새 시험을 생성하세요.">
                <div className="empty-state">선택된 시험이 없습니다.</div>
              </SectionCard>
            )}
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// 시험 메타 폼 — 새 시험 생성과 기본정보 탭에서 같이 사용한다.
// ---------------------------------------------------------------------------

function ExamMetaForm({ form, setForm, metadata, isSaving, submitLabel, onSubmit, onCancel }) {
  if (!metadata) {
    return <div className="empty-state">메타데이터를 불러오는 중입니다...</div>;
  }
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        시험명
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="4월 수학 실전"
          required
        />
      </label>
      <label>
        과목
        <select
          value={form.subject_id}
          onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value }))}
          required
        >
          <option value="">선택</option>
          {metadata.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        반
        <select
          value={form.class_group_id || ''}
          onChange={(event) => setForm((current) => ({ ...current, class_group_id: event.target.value }))}
        >
          <option value="">미지정</option>
          {metadata.class_groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        시행일
        <input
          type="date"
          value={form.exam_date}
          onChange={(event) => setForm((current) => ({ ...current, exam_date: event.target.value }))}
          required
        />
      </label>
      <label>
        총점
        <input
          type="number"
          min="1"
          value={form.total_score}
          onChange={(event) => setForm((current) => ({ ...current, total_score: event.target.value }))}
          required
        />
      </label>
      <label>
        시간 제한(분)
        <input
          type="number"
          min="1"
          value={form.time_limit_minutes}
          onChange={(event) => setForm((current) => ({ ...current, time_limit_minutes: event.target.value }))}
          required
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(form.is_retake)}
          onChange={(event) => setForm((current) => ({ ...current, is_retake: event.target.checked }))}
        />
        재시험 여부
      </label>
      <div className="form-actions form-span-2">
        <button type="submit" disabled={isSaving}>
          {isSaving ? '저장 중...' : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="secondary-button" onClick={onCancel}>
            취소
          </button>
        ) : null}
      </div>
    </form>
  );
}

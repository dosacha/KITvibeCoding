// 공유 시험 상세 — 제출 + 통계 보기

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber } from '../lib/studentLabels.js';

// 선택지 퍼센트 바
function ChoiceBar({ pct, isMine, isCorrect }) {
  return (
    <div className="choice-bar-track">
      <div
        className={`choice-bar-fill${isMine ? ' my-choice' : ''}${isCorrect ? ' correct' : ''}`}
        style={{ width: `${Math.min(100, Math.round(pct))}%` }}
      />
      <span className="choice-bar-pct">{Math.round(pct)}%</span>
    </div>
  );
}

// 제출 폼
function SubmissionForm({ exam, token, onSubmitted }) {
  const questions = exam.questions || [];
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(questions.map((q) => [q.question_number, null]))
  );
  const [submitting, setSubmitting] = useState(false);
  const { message, isError, flash, flashError } = useFlashMessage(5000);

  const setAnswer = (qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }));

  const submit = async (e) => {
    e.preventDefault();
    const unanswered = questions.filter((q) => answers[q.id] == null);
    if (unanswered.length > 0) {
      flashError(`${unanswered.length}개 문항에 답을 선택해줘.`);
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest(`/frontend/student/community-exams/${exam.id}/submissions`, {
        method: 'POST',
        token,
        body: {
          choices: Object.entries(answers).map(([question_number, selected_choice]) => ({
            question_number: Number(question_number),
            selected_choice,
          })),
        },
      });
      flash('제출 완료!');
      onSubmitted?.();
    } catch (err) {
      flashError(err.message || '제출 실패');
    } finally {
      setSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return <p className="muted small">이 시험에는 문항이 없어.</p>;
  }

  return (
    <form onSubmit={submit} className="submission-form">
      {questions.map((q, qi) => (
        <div key={q.question_number} className="submission-question">
          <p className="submission-q-title">
            <strong>Q{qi + 1}.</strong> {q.content || q.question_text || '문항'}
          </p>
          <div className="submission-choices">
            {(q.choices || ['1', '2', '3', '4', '5']).map((choice, ci) => {
              const val = typeof choice === 'string' ? choice : choice.value ?? ci + 1;
              const label = typeof choice === 'string' ? choice : choice.label || String(val);
              const isSelected = answers[q.question_number] === val;
              return (
                <label
                  key={ci}
                  className={`submission-choice${isSelected ? ' selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`q_${q.question_number}`}
                    value={val}
                    checked={isSelected}
                    onChange={() => setAnswer(q.question_number, val)}
                    style={{ display: 'none' }}
                  />
                  <span className="choice-num">{ci + 1}</span>
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {message ? <p className={isError ? 'error-text' : 'muted small'}>{message}</p> : null}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? '제출 중...' : '답안 제출하기'}
        </button>
      </div>
    </form>
  );
}

// 통계 뷰 (제출 후)
function StatsView({ stats, mySubmission }) {
  if (!stats) return <p className="muted small">통계 데이터를 불러오는 중이야.</p>;

  const questions = stats.questions || [];
  const myAnswers = Object.fromEntries(
    questions.map((q) => [q.question_number, q.my_choice]).filter(([, choice]) => choice != null)
  );

  return (
    <div className="stats-view stack-gap">
      {/* 전체 요약 */}
      <div className="metric-grid">
        {stats.total_submissions != null ? (
          <div className="metric-card">
            <span className="metric-label">제출자</span>
            <strong className="metric-value">{stats.total_submissions}명</strong>
          </div>
        ) : null}
        {stats.average_score != null ? (
          <div className="metric-card">
            <span className="metric-label">평균 점수</span>
            <strong className="metric-value">{formatNumber(stats.average_score, 1)}점</strong>
          </div>
        ) : null}
        {mySubmission?.score != null ? (
          <div className="metric-card">
            <span className="metric-label">내 점수</span>
            <strong className="metric-value" style={{ color: '#1d4ed8' }}>
              {formatNumber(mySubmission.score, 1)}점
            </strong>
          </div>
        ) : null}
      </div>

      {/* 문항별 통계 */}
      {questions.map((q, qi) => {
        const myChoice = myAnswers[q.question_number] ?? myAnswers[String(q.question_number)];
        const choices = q.choice_stats || q.choice_distribution || [];
        return (
          <div key={q.question_number} className="stats-question-card">
            <div className="stats-question-header">
              <strong>Q{qi + 1}. {q.content || q.question_text || '문항'}</strong>
              {(q.correct_answer ?? q.answer_key) != null ? (
                <span className="stats-correct-badge">
                  정답: {q.correct_answer ?? q.answer_key}번
                </span>
              ) : null}
              {q.correct_rate != null ? (
                <span className="muted small">정답률 {Math.round(q.correct_rate * 100)}%</span>
              ) : null}
            </div>
            <div className="stats-choices">
              {choices.map((c, ci) => {
                const value = c.value ?? c.choice ?? String(ci + 1);
                const isMine = String(myChoice) === String(value);
                const isCorrect = c.is_correct || String(q.correct_answer ?? q.answer_key) === String(value);
                return (
                  <div key={ci} className={`stats-choice-row${isMine ? ' my-choice' : ''}${isCorrect ? ' correct' : ''}`}>
                    <span className="choice-num">{ci + 1}</span>
                    <span className="stats-choice-label">{c.label || String(value)}</span>
                    <ChoiceBar pct={(c.rate ?? 0) * 100} isMine={isMine} isCorrect={isCorrect} />
                    {isMine ? <span className="stats-mine-marker">내 선택</span> : null}
                    {isCorrect ? <span className="stats-correct-marker">✓</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentCommunityExamDetailPage() {
  const { examId } = useParams();
  const { token } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const { data: examPayload, loading, error } = useAsyncData(
    () => apiRequest(`/frontend/student/community-exams/${examId}`, { token }),
    [token, examId]
  );

  const exam = examPayload
    ? {
        ...(examPayload.exam || examPayload),
        questions: (examPayload.questions || examPayload.exam?.questions || []).map((question) => ({
          ...question,
          choices: question.choices || Array.from(
            { length: examPayload.exam?.choice_count || examPayload.choice_count || 5 },
            (_, index) => String(index + 1)
          ),
        })),
      }
    : null;

  const { data: stats, reload: reloadStats } = useAsyncData(
    () =>
      (exam?.my_submission || submitted)
        ? apiRequest(`/frontend/student/community-exams/${examId}/stats`, { token })
        : Promise.resolve(null),
    [token, examId, exam?.my_submission, submitted]
  );

  const hasSubmitted = exam?.my_submission || submitted;

  const handleSubmitted = () => {
    setSubmitted(true);
    reloadStats();
  };

  return (
    <Layout
      title={exam?.title || '시험 상세'}
      backTo="/student/community-exams"
      backLabel="공유 시험 목록"
    >
      {loading ? <div className="empty-state">불러오는 중...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {exam ? (
        <>
          {/* 시험 정보 */}
          <SectionCard
            title={exam.title}
            subtitle={[exam.subject_name || exam.subject, exam.exam_date].filter(Boolean).join(' · ')}
          >
            <div className="stack-gap">
              {exam.description ? <p style={{ margin: 0 }}>{exam.description}</p> : null}
              <div className="flat-list">
                {exam.question_count != null ? (
                  <div className="flat-row">
                    <span className="muted small">문항 수</span>
                    <strong>{exam.question_count}문항</strong>
                  </div>
                ) : null}
                {exam.submission_count != null ? (
                  <div className="flat-row">
                    <span className="muted small">제출자</span>
                    <strong>{exam.submission_count}명</strong>
                  </div>
                ) : null}
                {exam.created_by_name ? (
                  <div className="flat-row">
                    <span className="muted small">출제자</span>
                    <strong>{exam.created_by_name}</strong>
                  </div>
                ) : null}
              </div>
              {hasSubmitted ? (
                <div className="info-box">
                  이미 제출했어. 아래에서 선택률과 내 답안을 비교해봐.
                </div>
              ) : null}
            </div>
          </SectionCard>

          {/* 제출 폼 또는 통계 */}
          {!hasSubmitted ? (
            <SectionCard
              title="내 답안 제출"
              subtitle="제출 후 문항별 선택률/정답률을 확인할 수 있어"
            >
              <SubmissionForm exam={exam} token={token} onSubmitted={handleSubmitted} />
            </SectionCard>
          ) : (
            <SectionCard
              title="문항별 선택률 · 정답률"
              subtitle="내 선택과 전체 비교"
            >
              <StatsView stats={stats} mySubmission={exam.my_submission} />
            </SectionCard>
          )}
        </>
      ) : null}
    </Layout>
  );
}

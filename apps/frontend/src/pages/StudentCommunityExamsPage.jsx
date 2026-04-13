// 공유 시험 — 검색/목록/생성

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';

// 시험 생성 폼 (인라인)
function CreateExamForm({ token, onCreated, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    exam_date: '',
  });
  const [saving, setSaving] = useState(false);
  const { message, isError, flash, flashError } = useFlashMessage(5000);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { flashError('시험 이름을 입력해줘.'); return; }
    setSaving(true);
    try {
      const res = await apiRequest('/frontend/student/community-exams', {
        method: 'POST',
        token,
        body: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          subject: form.subject.trim() || null,
          exam_date: form.exam_date || null,
        },
      });
      flash('시험을 만들었어.');
      onCreated?.(res);
    } catch (err) {
      flashError(err.message || '생성 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="community-exam-create-form">
      <div className="form-grid compact-grid">
        <label>
          시험 이름 <span className="required-mark">*</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="예: 2025 수능 수학 나형"
          />
        </label>
        <label>
          과목
          <input
            type="text"
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
            placeholder="예: 수학"
          />
        </label>
        <label>
          시험 날짜
          <input
            type="date"
            value={form.exam_date}
            onChange={(e) => set('exam_date', e.target.value)}
          />
        </label>
        <label className="form-span-2">
          설명 (선택)
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            placeholder="시험에 대해 간단히 설명해줘."
          />
        </label>
      </div>
      {message ? <p className={isError ? 'error-text' : 'muted small'}>{message}</p> : null}
      <div className="form-actions">
        <button type="submit" disabled={saving}>{saving ? '생성 중...' : '시험 생성'}</button>
        <button type="button" className="secondary-button" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
}

// 시험 카드 행
function ExamCard({ exam }) {
  return (
    <Link to={`/student/community-exams/${exam.id}`} className="community-exam-card">
      <div className="community-exam-card-header">
        <strong>{exam.title}</strong>
        {exam.subject ? <span className="community-exam-chip">{exam.subject}</span> : null}
      </div>
      {exam.description ? (
        <p className="muted small community-exam-desc">{exam.description}</p>
      ) : null}
      <div className="community-exam-meta">
        {exam.exam_date ? <span className="muted small">{exam.exam_date}</span> : null}
        {exam.submission_count != null ? (
          <span className="muted small">{exam.submission_count}명 제출</span>
        ) : null}
        {exam.my_submission ? (
          <span className="community-exam-submitted-badge">제출 완료</span>
        ) : null}
      </div>
    </Link>
  );
}

export default function StudentCommunityExamsPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { message, isError, flash } = useFlashMessage(4000);

  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest(`/frontend/student/community-exams${query ? `?query=${encodeURIComponent(query)}` : ''}`, { token }),
    [token, query]
  );

  const exams = Array.isArray(data) ? data : data?.exams || [];

  const handleCreated = (newExam) => {
    setShowCreate(false);
    flash('시험이 생성됐어. 바로 진입해서 답을 제출해봐.');
    reload();
  };

  return (
    <Layout title="공유 시험">
      {message ? <div className={isError ? 'error-box' : 'info-box'}>{message}</div> : null}

      {/* 검색 + 생성 */}
      <SectionCard
        title="시험 찾기"
        subtitle="학생들이 올린 시험을 검색하거나 직접 만들어봐"
        actions={
          !showCreate ? (
            <button type="button" className="secondary-button compact" onClick={() => setShowCreate(true)}>
              + 시험 만들기
            </button>
          ) : null
        }
      >
        {showCreate ? (
          <CreateExamForm
            token={token}
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        ) : (
          <div className="community-search-row">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="시험 이름, 과목, 날짜로 검색"
              style={{ flex: 1 }}
            />
          </div>
        )}
      </SectionCard>

      {/* 시험 목록 */}
      {loading ? <div className="empty-state">불러오는 중...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && exams.length === 0 ? (
        <div className="empty-state">
          {query ? `"${query}"에 해당하는 시험이 없어.` : '아직 공유된 시험이 없어. 처음으로 만들어봐.'}
        </div>
      ) : null}

      {exams.length > 0 ? (
        <SectionCard title="시험 목록" subtitle={`${exams.length}개`}>
          <div className="community-exam-list">
            {exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </Layout>
  );
}

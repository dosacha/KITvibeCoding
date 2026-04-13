import { useEffect, useState } from 'react';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';

export default function GoalEditorModal({ token, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState([]);
  const { message, isError, flash, flashError } = useFlashMessage(5000);

  useEffect(() => {
    apiRequest('/frontend/student/onboarding', { token })
      .then((res) => {
        setGoals(
          (res.goals || []).map((g) => ({
            university_name: g.university_name || '',
            admission_type: g.admission_type || '',
            priority: g.priority ?? 1,
          }))
        );
      })
      .catch(() => {
        // 조회 실패시 빈 폼으로 시작
      })
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (i, key, val) =>
    setGoals((prev) => prev.map((g, idx) => (idx === i ? { ...g, [key]: val } : g)));

  const addGoal = () =>
    setGoals((prev) => [
      ...prev,
      { university_name: '', admission_type: '', priority: prev.length + 1 },
    ]);

  const removeGoal = (i) => setGoals((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const valid = goals.filter((g) => g.university_name.trim());
    if (!valid.length) { flashError('대학 이름을 입력해줘.'); return; }
    setSaving(true);
    try {
      await apiRequest('/frontend/student/onboarding/goals', {
        method: 'PUT',
        token,
        body: { goals: valid.map((g, i) => ({ ...g, priority: i + 1 })) },
      });
      flash('목표대학을 저장했어.');
      onSaved?.();
      setTimeout(onClose, 800);
    } catch (err) {
      flashError(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <strong>목표대학 설정</strong>
          <button type="button" className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <p className="muted small">불러오는 중...</p>
        ) : (
          <div className="goal-editor-list">
            {goals.map((g, i) => (
              <div key={i} className="goal-editor-row">
                <span className="goal-priority-badge">{i + 1}순위</span>
                <div className="goal-editor-fields">
                  <input
                    type="text"
                    value={g.university_name}
                    onChange={(e) => setField(i, 'university_name', e.target.value)}
                    placeholder="대학 이름 (예: 서울대학교)"
                  />
                  <input
                    type="text"
                    value={g.admission_type}
                    onChange={(e) => setField(i, 'admission_type', e.target.value)}
                    placeholder="전형 종류 (예: 수능, 학생부종합)"
                  />
                </div>
                <button type="button" className="focus-remove-btn" onClick={() => removeGoal(i)}>
                  ×
                </button>
              </div>
            ))}
            {goals.length === 0 ? (
              <p className="muted small">목표대학을 추가해봐.</p>
            ) : null}
          </div>
        )}

        {message ? (
          <p className={isError ? 'error-text' : 'muted small'} style={{ margin: '0.3rem 0' }}>
            {message}
          </p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={addGoal}>
            + 대학 추가
          </button>
          <button type="button" onClick={save} disabled={saving || loading}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

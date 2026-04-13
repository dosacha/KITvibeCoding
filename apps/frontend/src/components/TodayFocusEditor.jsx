import { useState } from 'react';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';

const SOURCE_LABEL = { llm: 'AI', strategy_engine: '전략', coach: '강사' };

export default function TodayFocusEditor({ items: initialItems = [], token, onSaved }) {
  const [items, setItems] = useState(() => initialItems.map((it) => ({ ...it })));
  const [saving, setSaving] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [userNote, setUserNote] = useState('');
  const { message, isError, flash, flashError } = useFlashMessage(5000);

  const addItem = () =>
    setItems((prev) => [...prev, { title: '', reason: '', is_done: false, source: 'student' }]);

  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const setField = (i, key, val) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  const toggleDone = (i) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, is_done: !it.is_done } : it)));

  const save = async () => {
    const valid = items.filter((it) => it.title.trim());
    if (!valid.length) { flashError('항목을 최소 1개 입력해줘.'); return; }
    setSaving(true);
    try {
      await apiRequest('/frontend/student/home/today-focus', {
        method: 'PUT',
        token,
        body: { items: valid.map(({ title, reason }) => ({ title: title.trim(), reason: reason || '' })) },
      });
      flash('저장됐어.');
      onSaved?.();
    } catch (err) {
      flashError(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const recommend = async (mode = 'replace') => {
    setRecommending(true);
    try {
      const res = await apiRequest('/frontend/student/home/today-focus/recommend', {
        method: 'POST',
        token,
        body: { mode, user_note: userNote.trim() || null },
      });
      if (res.items?.length) {
        setItems(mode === 'append' ? [...items, ...res.items] : res.items.map((it) => ({ ...it })));
        flash(
          `AI 추천 ${res.items.length}개 받았어.${
            res.explanation_source === 'deterministic_fallback' ? ' (빠른 분석 기반)' : ''
          }`
        );
      }
    } catch (err) {
      flashError(err.message || 'AI 추천 실패');
    } finally {
      setRecommending(false);
    }
  };

  return (
    <div className="today-focus-editor">
      <div className="focus-item-list">
        {items.length === 0 ? (
          <p className="muted small">오늘 할 일을 추가하거나 AI 추천을 받아봐.</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className={`focus-item-row${item.is_done ? ' done' : ''}`}>
              <button
                type="button"
                className={`focus-done-btn${item.is_done ? ' checked' : ''}`}
                onClick={() => toggleDone(i)}
                title="완료 토글"
              >
                {item.is_done ? '✓' : '○'}
              </button>
              <div className="focus-item-fields">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => setField(i, 'title', e.target.value)}
                  placeholder="할 일 제목"
                />
                <input
                  type="text"
                  value={item.reason || ''}
                  onChange={(e) => setField(i, 'reason', e.target.value)}
                  placeholder="이유 (선택)"
                  className="focus-reason-input"
                />
              </div>
              {item.source && item.source !== 'student' ? (
                <span className="focus-source-chip">{SOURCE_LABEL[item.source] || item.source}</span>
              ) : null}
              <button
                type="button"
                className="focus-remove-btn"
                onClick={() => removeItem(i)}
                title="삭제"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <input
        type="text"
        value={userNote}
        onChange={(e) => setUserNote(e.target.value)}
        placeholder="AI에게 메모 (예: 수학 위주로, 짧게 3개만)"
        className="focus-note-input"
      />

      {message ? (
        <p className={isError ? 'error-text' : 'muted small'} style={{ margin: '0.3rem 0 0' }}>
          {message}
        </p>
      ) : null}

      <div className="focus-editor-actions">
        <button type="button" className="secondary-button" onClick={addItem}>
          + 직접 추가
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => recommend('replace')}
          disabled={recommending}
        >
          {recommending ? '추천 중...' : '⚡ AI 추천받기'}
        </button>
        {items.length > 0 ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => recommend('append')}
            disabled={recommending}
          >
            추가 추천
          </button>
        ) : null}
        <button type="button" onClick={save} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

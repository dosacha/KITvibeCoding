import { useEffect, useState } from 'react';

// 문항 생성/수정 폼.
// - 새 문항이면 question === null 로 호출, 저장 시 onSave(payload) 가 POST /questions 를 호출한다.
// - 기존 문항이면 question === {...} 로 호출, 저장 시 onSave(payload) 가 PUT /questions/{id} 를 호출한다.
// - units 는 frontend/metadata.units 그대로(과목 정보 포함) 받는다.
// - subjectId 가 있으면 단원 select 를 그 과목으로 필터링한다.
// - onSave 는 async 함수여야 한다(에러 시 throw).

const QUESTION_TYPES = ['multiple_choice', 'short_answer', 'descriptive'];
const PROBLEM_STYLES = ['concept', 'application', 'mixed', 'transfer', 'speed'];

const blankMapping = () => ({ unit_id: '', weight: 1 });

function buildInitialForm(question) {
  if (!question) {
    return {
      number: '',
      teacher_difficulty: 3,
      answer_key: '',
      points: 4,
      question_type: 'multiple_choice',
      problem_style: 'mixed',
      estimated_seconds: 90,
      unit_mappings: [blankMapping()],
    };
  }
  return {
    number: question.number ?? '',
    teacher_difficulty: question.teacher_difficulty ?? 3,
    answer_key: question.answer_key ?? '',
    points: question.points ?? 4,
    question_type: question.question_type || 'multiple_choice',
    problem_style: question.problem_style || 'mixed',
    estimated_seconds: question.estimated_seconds ?? 90,
    unit_mappings:
      question.unit_mappings && question.unit_mappings.length > 0
        ? question.unit_mappings.map((mapping) => ({
            unit_id: String(mapping.unit_id),
            weight: mapping.weight,
          }))
        : [blankMapping()],
  };
}

export default function QuestionEditor({ question, units, subjectId, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => buildInitialForm(question));
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(buildInitialForm(question));
    setError('');
  }, [question]);

  const filteredUnits = subjectId ? units.filter((unit) => unit.subject_id === subjectId) : units;

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateMapping = (index, key, value) =>
    setForm((current) => ({
      ...current,
      unit_mappings: current.unit_mappings.map((mapping, idx) => (idx === index ? { ...mapping, [key]: value } : mapping)),
    }));
  const addMapping = () => setForm((current) => ({ ...current, unit_mappings: [...current.unit_mappings, blankMapping()] }));
  const removeMapping = (index) =>
    setForm((current) => ({
      ...current,
      unit_mappings: current.unit_mappings.length > 1 ? current.unit_mappings.filter((_, idx) => idx !== index) : current.unit_mappings,
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const numberValue = Number(form.number);
    if (!Number.isInteger(numberValue) || numberValue < 1) {
      setError('문항 번호는 1 이상의 정수여야 합니다.');
      return;
    }
    const pointsValue = Number(form.points);
    if (!Number.isFinite(pointsValue) || pointsValue <= 0) {
      setError('배점은 0보다 큰 숫자여야 합니다.');
      return;
    }
    const validMappings = form.unit_mappings
      .filter((mapping) => mapping.unit_id !== '' && mapping.unit_id !== null)
      .map((mapping) => ({ unit_id: Number(mapping.unit_id), weight: Number(mapping.weight) || 1 }));
    if (validMappings.length === 0) {
      setError('단원 매핑을 최소 한 개 이상 입력하세요.');
      return;
    }
    if (validMappings.some((mapping) => mapping.weight <= 0)) {
      setError('단원 가중치는 0보다 커야 합니다.');
      return;
    }

    const payload = {
      number: numberValue,
      teacher_difficulty: Number(form.teacher_difficulty),
      answer_key: form.answer_key === '' ? null : form.answer_key,
      points: pointsValue,
      question_type: form.question_type,
      problem_style: form.problem_style,
      estimated_seconds: Number(form.estimated_seconds) || 60,
      unit_mappings: validMappings,
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  };

  return (
    <form className="question-editor" onSubmit={handleSubmit}>
      <div className="form-grid compact-grid">
        <label>
          문항 번호
          <input
            type="number"
            min="1"
            value={form.number}
            onChange={(event) => updateField('number', event.target.value)}
            required
          />
        </label>
        <label>
          교사 체감 난이도 (1-5)
          <input
            type="number"
            min="1"
            max="5"
            value={form.teacher_difficulty}
            onChange={(event) => updateField('teacher_difficulty', event.target.value)}
          />
        </label>
        <label>
          정답
          <input
            value={form.answer_key || ''}
            onChange={(event) => updateField('answer_key', event.target.value)}
            placeholder="예: A / 3 / 빈칸"
          />
        </label>
        <label>
          배점
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.points}
            onChange={(event) => updateField('points', event.target.value)}
            required
          />
        </label>
        <label>
          문항 유형
          <select value={form.question_type} onChange={(event) => updateField('question_type', event.target.value)}>
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          문제 스타일
          <select value={form.problem_style} onChange={(event) => updateField('problem_style', event.target.value)}>
            {PROBLEM_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
        <label>
          예상 풀이 시간(초)
          <input
            type="number"
            min="10"
            value={form.estimated_seconds}
            onChange={(event) => updateField('estimated_seconds', event.target.value)}
          />
        </label>
      </div>

      <div className="mapping-editor">
        <div className="mapping-editor-header">
          <strong>단원 매핑</strong>
          <span className="muted small">한 문항이 여러 단원에 걸치면 가중치를 다르게 줄 수 있습니다.</span>
        </div>
        {form.unit_mappings.map((mapping, index) => (
          <div className="mapping-row" key={index}>
            <select
              value={mapping.unit_id}
              onChange={(event) => updateMapping(index, 'unit_id', event.target.value)}
            >
              <option value="">단원 선택</option>
              {filteredUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.05"
              step="0.05"
              value={mapping.weight}
              onChange={(event) => updateMapping(index, 'weight', event.target.value)}
              aria-label="가중치"
            />
            <button
              type="button"
              className="secondary-button compact"
              onClick={() => removeMapping(index)}
              disabled={form.unit_mappings.length <= 1}
            >
              제거
            </button>
          </div>
        ))}
        <button type="button" className="secondary-button compact" onClick={addMapping}>
          단원 행 추가
        </button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? '저장 중...' : question ? '문항 수정 저장' : '문항 추가'}
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

import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';

// 대학 전형 프로필 관리자 화면 (admin 전용 저장 / instructor는 읽기 전용).
//
// subject_weights / required_subjects / bonus_rules / grade_conversion_rules 를
// 폼 기반 인라인 에디터로 편집한다. raw JSON은 "고급" 접힘 패널로만 제공한다.

const blankForm = () => ({
  academic_year: new Date().getFullYear(),
  university_name: '',
  admission_type: '',
  subject_weights: { 국어: 1.0, 수학: 1.2, 영어: 1.0 },
  required_subjects: ['국어', '수학', '영어'],
  bonus_rules: [],
  grade_conversion_rules: {},
  target_score: 85,
  notes: '',
});

const NEW_POLICY = 'new';

// ── 과목별 가중치 에디터 ──────────────────────────────────────
function SubjectWeightsEditor({ value, onChange, disabled }) {
  const entries = Object.entries(value || {});

  const updateRow = (index, subjectKey, weightStr) => {
    const next = [...entries];
    next[index] = [subjectKey, parseFloat(weightStr) || 0];
    onChange(Object.fromEntries(next));
  };

  const addRow = () => onChange({ ...(value || {}), '': 1.0 });

  const removeRow = (subject) => {
    const next = { ...(value || {}) };
    delete next[subject];
    onChange(next);
  };

  return (
    <div className="field-editor">
      <div className="field-editor-header">
        <span className="field-editor-label">과목별 가중치</span>
        {!disabled ? (
          <button type="button" className="secondary-button compact" onClick={addRow}>
            + 과목 추가
          </button>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="muted small">과목을 추가하세요.</p>
      ) : (
        <div className="editor-rows">
          <div className="editor-row three-col editor-header-row">
            <span className="small muted">과목명</span>
            <span className="small muted">가중치</span>
            <span />
          </div>
          {entries.map(([subject, weight], index) => (
            <div key={index} className="editor-row three-col">
              <input
                value={subject}
                placeholder="예: 국어"
                disabled={disabled}
                onChange={(e) => updateRow(index, e.target.value, weight)}
              />
              <input
                type="number"
                value={weight}
                step="0.1"
                min="0"
                max="5"
                disabled={disabled}
                onChange={(e) => updateRow(index, subject, e.target.value)}
              />
              {!disabled ? (
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={() => removeRow(subject)}
                >
                  삭제
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 필수 과목 에디터 (chip 목록) ─────────────────────────────
function RequiredSubjectsEditor({ value, onChange, disabled }) {
  const [inputValue, setInputValue] = useState('');
  const items = Array.isArray(value) ? value : [];

  const add = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInputValue('');
  };

  const remove = (subject) => onChange(items.filter((item) => item !== subject));

  return (
    <div className="field-editor">
      <span className="field-editor-label">필수 과목</span>
      {!disabled ? (
        <div className="chip-input-row">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="과목명 입력 후 Enter 또는 추가 버튼"
          />
          <button type="button" className="secondary-button compact" onClick={add}>
            추가
          </button>
        </div>
      ) : null}
      <div className="chip-list" style={{ marginTop: '0.4rem' }}>
        {items.length === 0 ? <span className="muted small">필수 과목 없음</span> : null}
        {items.map((item) => (
          <span key={item} className="chip-item chip-removable">
            {item}
            {!disabled ? (
              <button type="button" className="chip-remove" onClick={() => remove(item)}>
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 등급 환산 규칙 에디터 ─────────────────────────────────────
function GradeConversionEditor({ value, onChange, disabled }) {
  const rows = Object.entries(value || {}).sort((a, b) => Number(a[0]) - Number(b[0]));

  const updateRow = (index, gradeKey, scoreStr) => {
    const next = [...rows];
    next[index] = [gradeKey, parseFloat(scoreStr) || 0];
    onChange(Object.fromEntries(next));
  };

  const addRow = () => {
    const maxGrade = rows.length > 0 ? Math.max(...rows.map(([g]) => Number(g) || 0)) + 1 : 1;
    onChange({ ...(value || {}), [String(maxGrade)]: 100 });
  };

  const removeRow = (grade) => {
    const next = { ...(value || {}) };
    delete next[grade];
    onChange(next);
  };

  return (
    <div className="field-editor">
      <div className="field-editor-header">
        <span className="field-editor-label">등급 환산 규칙</span>
        {!disabled ? (
          <button type="button" className="secondary-button compact" onClick={addRow}>
            + 등급 추가
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="muted small">등급 규칙을 추가하세요. 비어 있으면 기본 환산 없이 처리됩니다.</p>
      ) : (
        <div className="editor-rows">
          <div className="editor-row three-col editor-header-row">
            <span className="small muted">등급</span>
            <span className="small muted">환산 점수</span>
            <span />
          </div>
          {rows.map(([grade, score], index) => (
            <div key={index} className="editor-row three-col">
              <input
                value={grade}
                placeholder="예: 1"
                disabled={disabled}
                onChange={(e) => updateRow(index, e.target.value, score)}
              />
              <input
                type="number"
                value={score}
                step="1"
                min="0"
                max="100"
                disabled={disabled}
                onChange={(e) => updateRow(index, grade, e.target.value)}
              />
              {!disabled ? (
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={() => removeRow(grade)}
                >
                  삭제
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 가산점 규칙 에디터 ───────────────────────────────────────
function BonusRulesEditor({ value, onChange, disabled }) {
  const rules = Array.isArray(value) ? value : [];

  const addRule = () =>
    onChange([...rules, { subject: '', bonus: 0, condition: '' }]);

  const updateRule = (index, field, val) =>
    onChange(rules.map((rule, i) => (i === index ? { ...rule, [field]: val } : rule)));

  const removeRule = (index) => onChange(rules.filter((_, i) => i !== index));

  return (
    <div className="field-editor">
      <div className="field-editor-header">
        <span className="field-editor-label">가산점 규칙</span>
        {!disabled ? (
          <button type="button" className="secondary-button compact" onClick={addRule}>
            + 규칙 추가
          </button>
        ) : null}
      </div>
      {rules.length === 0 ? (
        <p className="muted small">가산점 규칙이 없습니다. 필요한 경우 추가하세요.</p>
      ) : (
        <div className="editor-rows">
          {rules.map((rule, index) => (
            <div key={index} className="bonus-rule-row">
              <label className="small">
                과목
                <input
                  value={rule.subject || ''}
                  placeholder="예: 수학"
                  disabled={disabled}
                  onChange={(e) => updateRule(index, 'subject', e.target.value)}
                />
              </label>
              <label className="small">
                가산점
                <input
                  type="number"
                  value={rule.bonus ?? 0}
                  step="1"
                  disabled={disabled}
                  onChange={(e) => updateRule(index, 'bonus', Number(e.target.value))}
                />
              </label>
              <label className="small">
                조건
                <input
                  value={rule.condition || ''}
                  placeholder="예: 1등급"
                  disabled={disabled}
                  onChange={(e) => updateRule(index, 'condition', e.target.value)}
                />
              </label>
              {!disabled ? (
                <button
                  type="button"
                  className="secondary-button compact"
                  style={{ alignSelf: 'flex-end' }}
                  onClick={() => removeRule(index)}
                >
                  삭제
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────
export default function UniversityPoliciesPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const { message: pageMessage, isError: pageIsError, flash: showFlash, flashError: showError } = useFlashMessage(5000);

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const policies = await apiRequest('/frontend/universities/policies', { token });
      return { policies };
    },
    [token]
  );

  useEffect(() => {
    if (!data?.policies?.length) return;
    if (selectedId === null) setSelectedId(data.policies[0].id);
  }, [data, selectedId]);

  useEffect(() => {
    if (!data?.policies) return;
    if (selectedId === NEW_POLICY) {
      setForm(blankForm());
      return;
    }
    const policy = data.policies.find((item) => item.id === selectedId);
    if (policy) {
      setForm({
        academic_year: policy.academic_year,
        university_name: policy.university_name,
        admission_type: policy.admission_type,
        subject_weights: policy.subject_weights || {},
        required_subjects: policy.required_subjects || [],
        bonus_rules: policy.bonus_rules || [],
        grade_conversion_rules: policy.grade_conversion_rules || {},
        target_score: policy.target_score,
        notes: policy.notes || '',
      });
    }
  }, [data, selectedId]);

  const policies = data?.policies || [];
  const isNewMode = selectedId === NEW_POLICY;

  const sortedPolicies = useMemo(() => {
    return [...policies].sort((a, b) => {
      if (a.university_name !== b.university_name)
        return a.university_name.localeCompare(b.university_name);
      return (b.academic_year || 0) - (a.academic_year || 0);
    });
  }, [policies]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      showError('대학 정책은 관리자 계정에서만 저장할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        academic_year: Number(form.academic_year),
        university_name: form.university_name.trim(),
        admission_type: form.admission_type.trim(),
        subject_weights: form.subject_weights || {},
        required_subjects: form.required_subjects || [],
        bonus_rules: form.bonus_rules || [],
        grade_conversion_rules: form.grade_conversion_rules || {},
        target_score: Number(form.target_score),
        notes: form.notes || null,
      };
      if (!body.university_name || !body.admission_type) {
        throw new Error('대학 이름과 전형 종류는 필수입니다.');
      }
      if (isNewMode) {
        const created = await apiRequest('/universities/policies', {
          method: 'POST',
          token,
          body,
        });
        showFlash('대학 정책을 생성했습니다. 연결된 학생이 있으면 자동으로 재계산됩니다.');
        await reload();
        setSelectedId(created.id);
      } else {
        await apiRequest(`/universities/policies/${selectedId}`, {
          method: 'PUT',
          token,
          body,
        });
        showFlash(
          '저장했습니다. 이 정책을 목표로 설정한 학생의 진단·전략이 자동 재계산됩니다.'
        );
        await reload();
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="대학 정책 관리" backTo="/instructor" backLabel="대시보드로 돌아가기">
      {loading ? <div className="empty-state">대학 정책을 불러오는 중입니다...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {pageMessage ? <div className={pageIsError ? 'error-box' : 'info-box'}>{pageMessage}</div> : null}

      {!isAdmin ? (
        <div className="info-box warn">
          관리자 전용 페이지입니다. 지금은 읽기 전용으로 확인할 수 있습니다. 정책을 수정하려면 관리자 계정으로 로그인하세요.
        </div>
      ) : null}

      {data ? (
        <div className="exams-layout">
          {/* 좌측: 정책 목록 */}
          <aside className="exams-sidebar">
            <div className="exams-sidebar-header">
              <strong>등록된 정책</strong>
              {isAdmin ? (
                <button
                  type="button"
                  className="compact"
                  onClick={() => setSelectedId(NEW_POLICY)}
                >
                  + 새 정책
                </button>
              ) : null}
            </div>
            <ul className="exams-list">
              {sortedPolicies.length === 0 ? (
                <li className="muted small">등록된 정책이 없습니다.</li>
              ) : null}
              {sortedPolicies.map((policy) => {
                const isActive = policy.id === selectedId;
                return (
                  <li key={policy.id}>
                    <button
                      type="button"
                      className={`exam-list-item${isActive ? ' active' : ''}`}
                      onClick={() => setSelectedId(policy.id)}
                    >
                      <div>
                        <strong>{policy.university_name}</strong>
                        <div className="small muted">
                          {policy.admission_type} · {policy.academic_year}학년도
                        </div>
                      </div>
                      <div className="policy-list-meta">
                        <span className="policy-meta-chip">목표: {policy.target_score}점</span>
                        {typeof policy.student_count === 'number' ? (
                          <span className="policy-meta-chip students">
                            연결 학생: {policy.student_count}명
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* 우측: 편집 폼 */}
          <div className="exams-main">
            <SectionCard
              title={isNewMode ? '새 대학 정책 등록' : '대학 정책 편집'}
              subtitle={
                isAdmin
                  ? '저장 시 이 정책을 목표로 설정한 학생들의 진단·전략이 자동으로 재계산됩니다.'
                  : '읽기 전용 · 저장하려면 관리자 계정이 필요합니다.'
              }
            >
              <form className="form-grid" onSubmit={handleSubmit}>
                {/* 기본 정보 */}
                <label>
                  학년도
                  <input
                    type="number"
                    min="2020"
                    max="2100"
                    value={form.academic_year}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm((cur) => ({ ...cur, academic_year: e.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  대학 이름
                  <input
                    value={form.university_name}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm((cur) => ({ ...cur, university_name: e.target.value }))
                    }
                    required
                    placeholder="예: 서울대학교"
                  />
                </label>
                <label>
                  전형 종류
                  <input
                    value={form.admission_type}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm((cur) => ({ ...cur, admission_type: e.target.value }))
                    }
                    required
                    placeholder="예: 정시 / 학종 / 논술"
                  />
                </label>
                <label>
                  목표 점수
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.target_score}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm((cur) => ({ ...cur, target_score: e.target.value }))
                    }
                    required
                  />
                </label>

                {/* 폼 기반 JSON 필드들 */}
                <div className="form-span-2">
                  <SubjectWeightsEditor
                    value={form.subject_weights}
                    onChange={(val) => setForm((cur) => ({ ...cur, subject_weights: val }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="form-span-2">
                  <RequiredSubjectsEditor
                    value={form.required_subjects}
                    onChange={(val) => setForm((cur) => ({ ...cur, required_subjects: val }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="form-span-2">
                  <GradeConversionEditor
                    value={form.grade_conversion_rules}
                    onChange={(val) =>
                      setForm((cur) => ({ ...cur, grade_conversion_rules: val }))
                    }
                    disabled={!isAdmin}
                  />
                </div>
                <div className="form-span-2">
                  <BonusRulesEditor
                    value={form.bonus_rules}
                    onChange={(val) => setForm((cur) => ({ ...cur, bonus_rules: val }))}
                    disabled={!isAdmin}
                  />
                </div>

                <label className="form-span-2">
                  메모
                  <textarea
                    rows={3}
                    value={form.notes}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm((cur) => ({ ...cur, notes: e.target.value }))
                    }
                    placeholder="운영 참고 메모"
                  />
                </label>

                {isAdmin ? (
                  <div className="form-actions form-span-2">
                    <button type="submit" disabled={saving}>
                      {saving ? '저장 중...' : isNewMode ? '정책 생성' : '정책 저장'}
                    </button>
                    {isNewMode ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setSelectedId(sortedPolicies[0]?.id || null)}
                      >
                        취소
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {/* 고급: raw JSON 보기 (접힘) */}
                <div className="form-span-2">
                  <details className="advanced-json-section">
                    <summary>고급 JSON 원문 보기</summary>
                    <div className="stack-gap" style={{ marginTop: '0.5rem' }}>
                      <div>
                        <div className="small muted" style={{ marginBottom: '0.25rem' }}>
                          과목별 가중치 (subject_weights)
                        </div>
                        <pre>{JSON.stringify(form.subject_weights, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="small muted" style={{ marginBottom: '0.25rem' }}>
                          필수 과목 (required_subjects)
                        </div>
                        <pre>{JSON.stringify(form.required_subjects, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="small muted" style={{ marginBottom: '0.25rem' }}>
                          등급 환산 규칙 (grade_conversion_rules)
                        </div>
                        <pre>{JSON.stringify(form.grade_conversion_rules, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="small muted" style={{ marginBottom: '0.25rem' }}>
                          가산점 규칙 (bonus_rules)
                        </div>
                        <pre>{JSON.stringify(form.bonus_rules, null, 2)}</pre>
                      </div>
                    </div>
                  </details>
                </div>
              </form>
            </SectionCard>

            {/* 영향 범위 */}
            <SectionCard
              title="영향 범위"
              subtitle="저장 시 이 정책을 목표로 설정한 학생들이 자동 재계산됩니다. 결과는 감사 로그에서 확인할 수 있습니다."
            >
              {(() => {
                const currentPolicy = !isNewMode
                  ? sortedPolicies.find((item) => item.id === selectedId)
                  : null;
                const count = currentPolicy?.student_count;
                if (typeof count === 'number' && count > 0) {
                  return (
                    <div className="info-box warn">
                      현재 <strong>{count}명</strong>의 학생이 이 정책을 활성 목표로 설정하고
                      있습니다. 저장 시 해당 학생들의 진단·전략이 자동 재계산됩니다.
                    </div>
                  );
                }
                if (typeof count === 'number') {
                  return (
                    <p className="muted small">
                      이 정책을 활성 목표로 설정한 학생이 아직 없습니다.
                    </p>
                  );
                }
                return (
                  <p className="muted small">
                    변경 즉시 학생의 진단·전략이 다시 계산되며, 결과는 감사 페이지의 필드 변경
                    이력 / 재계산 작업 탭에서 확인할 수 있습니다.
                  </p>
                );
              })()}
            </SectionCard>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { apiClient } from "../lib/apiClient.js";
import { toSubjectLabel } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { ListCard } from "../components/common/ListCard.jsx";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";

const SUBJECT_CODES = ["KOR", "MATH", "ENG", "SCI", "SOC"];

function createEmptyForm() {
  return {
    university_name: "",
    admission_type: "",
    target_score: 84,
    notes: "",
    subject_weights: {
      KOR: 0.3,
      MATH: 0.4,
      ENG: 0.3,
      SCI: 0,
      SOC: 0,
    },
    required_subjects: ["KOR", "MATH", "ENG"],
  };
}

export function UniversityPolicyPage() {
  const { session } = useAuth();
  const { data, error, loading, reload } = useAsyncData(() => apiClient.getUniversities(session.accessToken), [session.accessToken]);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [form, setForm] = useState(createEmptyForm());
  const [message, setMessage] = useState("");

  const policies = data ?? [];
  const selectedPolicy = useMemo(
    () => policies.find((policy) => String(policy.id) === String(selectedPolicyId)),
    [policies, selectedPolicyId],
  );

  function loadPolicyIntoForm(policy) {
    setForm({
      university_name: policy.university_name ?? policy.universityName,
      admission_type: policy.admission_type ?? policy.admissionType,
      target_score: policy.target_score ?? policy.targetScore,
      notes: policy.notes ?? "",
      subject_weights: SUBJECT_CODES.reduce(
        (accumulator, code) => ({
          ...accumulator,
          [code]: Number((policy.subject_weights ?? policy.subjectWeights ?? {})[code] ?? 0),
        }),
        {},
      ),
      required_subjects: [...(policy.required_subjects ?? policy.requiredSubjects ?? [])],
    });
  }

  async function handleCreate(event) {
    event.preventDefault();
    setMessage("");
    try {
      await apiClient.createUniversityPolicy(session.accessToken, {
        ...form,
        target_score: Number(form.target_score),
        subject_weights: normalizeWeights(form.subject_weights),
        bonus_rules: [],
        grade_conversion_rules: {},
      });
      setMessage("대학 정책을 등록했어.");
      setForm(createEmptyForm());
      reload();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "대학 정책 등록에 실패했어.");
    }
  }

  async function handleUpdate() {
    if (!selectedPolicyId) return;
    setMessage("");
    try {
      await apiClient.updateUniversityPolicy(session.accessToken, Number(selectedPolicyId), {
        ...form,
        target_score: Number(form.target_score),
        subject_weights: normalizeWeights(form.subject_weights),
        bonus_rules: [],
        grade_conversion_rules: {},
      });
      setMessage("대학 정책을 수정했어.");
      reload();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "대학 정책 수정에 실패했어.");
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <h1>목표 대학 정책</h1>
        <p className="muted">대학별 반영 비율과 목표 점수를 조회하고 직접 수정할 수 있어.</p>
        {loading ? <LoadingPanel title="대학 정책을 불러오는 중" description="대학별 반영 기준을 정리하고 있어." /> : null}
        {error ? <StatusBox tone="error" title="정책을 불러오지 못했어" description={error} /> : null}
      </section>

      <section className="two-grid">
        <section className="panel">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>정책 등록과 수정</h2>
            <div className="toolbar">
              <select value={selectedPolicyId} onChange={(event) => setSelectedPolicyId(event.target.value)}>
                <option value="">기존 정책 선택</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.university_name ?? policy.universityName}
                  </option>
                ))}
              </select>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  if (selectedPolicy) loadPolicyIntoForm(selectedPolicy);
                }}
                disabled={!selectedPolicy}
              >
                값 불러오기
              </button>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleCreate}>
            <div className="form-grid">
              <label className="field">
                <span>대학 이름</span>
                <input value={form.university_name} onChange={(event) => setForm((prev) => ({ ...prev, university_name: event.target.value }))} />
              </label>
              <label className="field">
                <span>전형 이름</span>
                <input value={form.admission_type} onChange={(event) => setForm((prev) => ({ ...prev, admission_type: event.target.value }))} />
              </label>
              <label className="field">
                <span>목표 점수</span>
                <input type="number" value={form.target_score} onChange={(event) => setForm((prev) => ({ ...prev, target_score: Number(event.target.value) }))} />
              </label>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>비고</span>
                <input value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </label>
            </div>

            <div className="panel" style={{ background: "#f8fbff", boxShadow: "none" }}>
              <h3 style={{ marginTop: 0 }}>과목 반영 비율</h3>
              <div className="form-grid">
                {SUBJECT_CODES.map((code) => (
                  <label key={code} className="field">
                    <span>{toSubjectLabel(code)}</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.subject_weights[code] ?? 0}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          subject_weights: {
                            ...prev.subject_weights,
                            [code]: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="panel" style={{ background: "#f8fbff", boxShadow: "none" }}>
              <h3 style={{ marginTop: 0 }}>필수 반영 과목</h3>
              <div className="toolbar">
                {SUBJECT_CODES.map((code) => (
                  <label key={code} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={form.required_subjects.includes(code)}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          required_subjects: event.target.checked
                            ? [...prev.required_subjects, code]
                            : prev.required_subjects.filter((subjectCode) => subjectCode !== code),
                        }))
                      }
                    />
                    <span>{toSubjectLabel(code)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="toolbar">
              <button className="primary-button" type="submit">새 정책 등록</button>
              <button className="ghost-button" type="button" disabled={!selectedPolicyId} onClick={handleUpdate}>
                선택한 정책 수정
              </button>
              <button className="ghost-button" type="button" onClick={() => setForm(createEmptyForm())}>
                입력 초기화
              </button>
            </div>
          </form>
          {message ? <StatusBox tone={message.includes("실패") ? "error" : "info"} title="정책 작업 결과" description={message} /> : null}
        </section>

        <section className="panel">
          <h2>등록된 정책 요약</h2>
          {selectedPolicy ? (
            <>
              <div className="status-box info" style={{ marginBottom: 16 }}>
                <strong>{selectedPolicy.university_name ?? selectedPolicy.universityName}</strong>
                <div>
                  {selectedPolicy.admission_type ?? selectedPolicy.admissionType} · 목표 점수{" "}
                  {selectedPolicy.target_score ?? selectedPolicy.targetScore}
                </div>
              </div>
              <ListCard
                title="반영 과목 비율"
                items={Object.entries(selectedPolicy.subject_weights ?? selectedPolicy.subjectWeights ?? {}).map(
                  ([subject, weight]) => `${toSubjectLabel(subject)} ${Math.round(Number(weight) * 100)}%`,
                )}
              />
              <ListCard
                title="필수 반영 과목"
                items={(selectedPolicy.required_subjects ?? selectedPolicy.requiredSubjects ?? []).map((subject) => toSubjectLabel(subject))}
              />
            </>
          ) : (
            <StatusBox tone="empty" title="선택한 정책이 없어" description="왼쪽에서 기존 정책을 고르거나 새 정책을 등록해 줘." />
          )}
        </section>
      </section>

      <section className="three-grid">
        {policies.map((policy) => (
          <section key={policy.id} className="panel">
            <h2>{policy.university_name ?? policy.universityName}</h2>
            <p className="muted">{policy.admission_type ?? policy.admissionType}</p>
            <ListCard
              title="반영 과목 비율"
              items={Object.entries(policy.subject_weights ?? policy.subjectWeights ?? {}).map(
                ([subject, weight]) => `${toSubjectLabel(subject)} ${Math.round(Number(weight) * 100)}%`,
              )}
            />
          </section>
        ))}
      </section>
    </div>
  );
}

function normalizeWeights(subjectWeights) {
  return Object.fromEntries(
    Object.entries(subjectWeights).filter(([, value]) => Number(value) > 0).map(([key, value]) => [key, Number(value)]),
  );
}
